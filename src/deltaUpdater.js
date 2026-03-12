const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const zlib = require('zlib');
const { app } = require('electron');

const DELTA_CONFIG = {
    chunkSize: 512 * 1024,
    maxConcurrentDownloads: 4,
    retryAttempts: 3,
    retryDelay: 2000,
    manifestCacheTime: 24 * 60 * 60 * 1000,
    tempDir: 'delta-temp',
    enableCompression: true,
    minDeltaSize: 1024 * 1024
};

class DeltaManifest {
    constructor() {
        this.version = '1.0';
        this.files = new Map();
        this.chunks = new Map();
        this.baseVersion = null;
        this.targetVersion = null;
        this.totalSize = 0;
        this.deltaSize = 0;
        this.timestamp = Date.now();
    }

    addFile(filePath, hash, size, chunks) {
        this.files.set(filePath, { hash, size, chunks });
        this.totalSize += size;
    }

    addChunk(chunkId, hash, size, compressedSize, url) {
        this.chunks.set(chunkId, { hash, size, compressedSize, url });
        this.deltaSize += compressedSize || size;
    }

    toJSON() {
        return {
            version: this.version,
            baseVersion: this.baseVersion,
            targetVersion: this.targetVersion,
            totalSize: this.totalSize,
            deltaSize: this.deltaSize,
            timestamp: this.timestamp,
            files: Object.fromEntries(this.files),
            chunks: Object.fromEntries(this.chunks)
        };
    }

    static fromJSON(json) {
        const manifest = new DeltaManifest();
        manifest.version = json.version || '1.0';
        manifest.baseVersion = json.baseVersion;
        manifest.targetVersion = json.targetVersion;
        manifest.totalSize = json.totalSize || 0;
        manifest.deltaSize = json.deltaSize || 0;
        manifest.timestamp = json.timestamp || Date.now();
        
        if (json.files) {
            Object.entries(json.files).forEach(([path, info]) => {
                manifest.files.set(path, info);
            });
        }
        
        if (json.chunks) {
            Object.entries(json.chunks).forEach(([id, info]) => {
                manifest.chunks.set(id, info);
            });
        }
        
        return manifest;
    }
}

class ChunkDownloader {
    constructor(logger) {
        this.logger = logger;
        this.activeDownloads = new Map();
        this.completedChunks = new Map();
        this.failedChunks = new Map();
    }

    async downloadChunk(chunkInfo, mirror, onProgress) {
        const chunkId = chunkInfo.hash;
        
        if (this.completedChunks.has(chunkId)) {
            return this.completedChunks.get(chunkId);
        }

        if (this.activeDownloads.has(chunkId)) {
            return this.activeDownloads.get(chunkId);
        }

        const downloadPromise = this._doDownloadChunk(chunkInfo, mirror, onProgress);
        this.activeDownloads.set(chunkId, downloadPromise);

        try {
            const result = await downloadPromise;
            this.completedChunks.set(chunkId, result);
            return result;
        } catch (error) {
            this.failedChunks.set(chunkId, error);
            throw error;
        } finally {
            this.activeDownloads.delete(chunkId);
        }
    }

    async _doDownloadChunk(chunkInfo, mirror, onProgress) {
        const urls = this._getChunkUrls(chunkInfo, mirror);
        let lastError = null;

        for (const url of urls) {
            try {
                this.logger.info(`Downloading chunk from: ${url}`);
                const data = await this._downloadWithRetry(url, onProgress);
                
                if (chunkInfo.compressedSize && chunkInfo.compressedSize < chunkInfo.size) {
                    return await this._decompressData(data);
                }
                return data;
            } catch (error) {
                lastError = error;
                this.logger.warn(`Failed to download chunk from ${url}: ${error.message}`);
            }
        }

        throw lastError || new Error('All chunk download attempts failed');
    }

    _getChunkUrls(chunkInfo, mirror) {
        const urls = [];
        
        if (chunkInfo.url) {
            urls.push(chunkInfo.url);
        }
        
        if (mirror && mirror.url) {
            const chunkPath = chunkInfo.url ? new URL(chunkInfo.url).pathname : `/chunks/${chunkInfo.hash}`;
            urls.push(`${mirror.url}${chunkPath}`);
        }
        
        return urls;
    }

    async _downloadWithRetry(url, onProgress, maxRetries = DELTA_CONFIG.retryAttempts) {
        let lastError = null;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this._downloadUrl(url, onProgress);
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries - 1) {
                    await this._sleep(DELTA_CONFIG.retryDelay * (attempt + 1));
                }
            }
        }
        
        throw lastError;
    }

    async _downloadUrl(url, onProgress) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;
            
            const chunks = [];
            let downloaded = 0;

            const request = protocol.get(url, {
                headers: {
                    'User-Agent': 'StarWing-DeltaUpdater/1.0',
                    'Accept-Encoding': 'gzip, deflate'
                }
            }, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    this._downloadUrl(response.headers.location, onProgress)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }

                response.on('data', (chunk) => {
                    chunks.push(chunk);
                    downloaded += chunk.length;
                    if (onProgress) {
                        onProgress(downloaded);
                    }
                });

                response.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });

                response.on('error', reject);
            });

            request.on('error', reject);
            request.setTimeout(60000, () => {
                request.destroy();
                reject(new Error('Download timeout'));
            });
        });
    }

    async _decompressData(data) {
        return new Promise((resolve, reject) => {
            zlib.gunzip(data, (err, result) => {
                if (err) {
                    resolve(data);
                } else {
                    resolve(result);
                }
            });
        });
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            active: this.activeDownloads.size,
            completed: this.completedChunks.size,
            failed: this.failedChunks.size
        };
    }
}

class DeltaBuilder {
    constructor(logger) {
        this.logger = logger;
    }

    calculateFileHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    calculateChunkHashes(filePath, chunkSize = DELTA_CONFIG.chunkSize) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const hash = crypto.createHash('sha256');
            let position = 0;
            let chunkIndex = 0;

            const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
            
            stream.on('data', (data) => {
                const chunkHash = crypto.createHash('sha256').update(data).digest('hex');
                chunks.push({
                    index: chunkIndex,
                    hash: chunkHash,
                    size: data.length,
                    offset: position
                });
                position += data.length;
                chunkIndex++;
            });

            stream.on('end', () => resolve(chunks));
            stream.on('error', reject);
        });
    }

    async buildDeltaManifest(sourceDir, targetDir, baseVersion, targetVersion) {
        const manifest = new DeltaManifest();
        manifest.baseVersion = baseVersion;
        manifest.targetVersion = targetVersion;

        const sourceFiles = await this._scanDirectory(sourceDir);
        const targetFiles = await this._scanDirectory(targetDir);

        for (const [relativePath, targetInfo] of targetFiles) {
            const sourceInfo = sourceFiles.get(relativePath);
            
            if (!sourceInfo) {
                this.logger.info(`New file: ${relativePath}`);
                const chunks = await this.calculateChunkHashes(targetInfo.fullPath);
                manifest.addFile(relativePath, targetInfo.hash, targetInfo.size, chunks);
                
                for (const chunk of chunks) {
                    manifest.addChunk(chunk.hash, chunk.hash, chunk.size, null, null);
                }
            } else {
                if (sourceInfo.hash !== targetInfo.hash) {
                    this.logger.info(`Modified file: ${relativePath}`);
                    const sourceChunks = await this.calculateChunkHashes(sourceInfo.fullPath);
                    const targetChunks = await this.calculateChunkHashes(targetInfo.fullPath);
                    
                    const deltaChunks = this._findDeltaChunks(sourceChunks, targetChunks);
                    manifest.addFile(relativePath, targetInfo.hash, targetInfo.size, targetChunks);
                    
                    for (const chunk of deltaChunks) {
                        manifest.addChunk(chunk.hash, chunk.hash, chunk.size, null, null);
                    }
                }
            }
        }

        return manifest;
    }

    _findDeltaChunks(sourceChunks, targetChunks) {
        const sourceHashes = new Set(sourceChunks.map(c => c.hash));
        return targetChunks.filter(chunk => !sourceHashes.has(chunk.hash));
    }

    async _scanDirectory(dir) {
        const files = new Map();
        
        if (!fs.existsSync(dir)) {
            return files;
        }

        const scan = async (currentDir, baseDir) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                const relativePath = path.relative(baseDir, fullPath);
                
                if (entry.isDirectory()) {
                    await scan(fullPath, baseDir);
                } else if (entry.isFile()) {
                    const stat = fs.statSync(fullPath);
                    const hash = await this.calculateFileHash(fullPath);
                    files.set(relativePath.replace(/\\/g, '/'), {
                        fullPath,
                        hash,
                        size: stat.size
                    });
                }
            }
        };

        await scan(dir, dir);
        return files;
    }
}

class DeltaApplier {
    constructor(logger) {
        this.logger = logger;
    }

    async applyDelta(manifest, chunkCache, targetDir, onProgress) {
        this.logger.info('Starting delta application');
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        let processedFiles = 0;
        const totalFiles = manifest.files.size;

        for (const [filePath, fileInfo] of manifest.files) {
            const targetPath = path.join(targetDir, filePath);
            const targetDirPath = path.dirname(targetPath);
            
            if (!fs.existsSync(targetDirPath)) {
                fs.mkdirSync(targetDirPath, { recursive: true });
            }

            await this._applyFile(fileInfo, chunkCache, targetPath);
            
            processedFiles++;
            if (onProgress) {
                onProgress({
                    file: filePath,
                    progress: Math.round((processedFiles / totalFiles) * 100),
                    processed: processedFiles,
                    total: totalFiles
                });
            }
        }

        this.logger.info('Delta application completed');
        return true;
    }

    async _applyFile(fileInfo, chunkCache, targetPath) {
        const chunks = [];
        
        for (const chunkInfo of fileInfo.chunks) {
            const chunkData = chunkCache.get(chunkInfo.hash);
            if (!chunkData) {
                throw new Error(`Missing chunk: ${chunkInfo.hash}`);
            }
            chunks.push({ data: chunkData, offset: chunkInfo.offset });
        }

        chunks.sort((a, b) => a.offset - b.offset);

        const fileData = Buffer.concat(chunks.map(c => c.data));
        
        const actualHash = crypto.createHash('sha256').update(fileData).digest('hex');
        if (actualHash !== fileInfo.hash) {
            throw new Error(`File hash mismatch for ${targetPath}`);
        }

        fs.writeFileSync(targetPath, fileData);
        this.logger.debug(`Applied file: ${targetPath}`);
    }
}

class DeltaUpdater {
    constructor(logger) {
        this.logger = logger || console;
        this.chunkDownloader = new ChunkDownloader(this.logger);
        this.deltaBuilder = new DeltaBuilder(this.logger);
        this.deltaApplier = new DeltaApplier(this.logger);
        this.tempDir = path.join(app.getPath('temp'), DELTA_CONFIG.tempDir);
        this.chunkCache = new Map();
        this.downloadProgress = { total: 0, downloaded: 0, currentFile: '' };
    }

    async initialize() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        this.logger.info('DeltaUpdater initialized');
    }

    async checkDeltaUpdate(currentVersion, targetVersion, mirrors) {
        this.logger.info(`Checking for delta update: ${currentVersion} -> ${targetVersion}`);
        
        for (const mirror of mirrors) {
            try {
                const manifestUrl = this._buildManifestUrl(mirror, currentVersion, targetVersion);
                const manifest = await this._fetchManifest(manifestUrl);
                
                if (manifest && manifest.deltaSize > 0) {
                    const savings = this._calculateSavings(manifest);
                    this.logger.info(`Delta update available: ${savings}% smaller`);
                    return {
                        available: true,
                        manifest,
                        mirror,
                        savings
                    };
                }
            } catch (error) {
                this.logger.warn(`Failed to check delta from ${mirror.name}: ${error.message}`);
            }
        }

        return { available: false };
    }

    _buildManifestUrl(mirror, currentVersion, targetVersion) {
        if (mirror.type === 'github') {
            return `https://github.com/Jay-Victor/StarWing/releases/download/v${targetVersion}/delta-${currentVersion}-${targetVersion}.json`;
        } else if (mirror.type === 'gitee') {
            return `https://gitee.com/Jay-Victor/star-wing/releases/download/v${targetVersion}/delta-${currentVersion}-${targetVersion}.json`;
        } else if (mirror.url) {
            return `${mirror.url}releases/download/v${targetVersion}/delta-${currentVersion}-${targetVersion}.json`;
        }
        return null;
    }

    async _fetchManifest(url) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const request = protocol.get(url, {
                headers: {
                    'User-Agent': 'StarWing-DeltaUpdater/1.0',
                    'Accept': 'application/json'
                }
            }, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    this._fetchManifest(response.headers.location)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (response.statusCode === 404) {
                    resolve(null);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }

                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(DeltaManifest.fromJSON(json));
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            request.on('error', reject);
            request.setTimeout(15000, () => {
                request.destroy();
                reject(new Error('Manifest fetch timeout'));
            });
        });
    }

    _calculateSavings(manifest) {
        if (manifest.totalSize === 0) return 0;
        return Math.round((1 - manifest.deltaSize / manifest.totalSize) * 100);
    }

    async downloadDelta(manifest, mirror, onProgress) {
        this.logger.info('Starting delta download');
        
        this.downloadProgress = {
            total: manifest.deltaSize,
            downloaded: 0,
            currentFile: ''
        };

        const chunks = Array.from(manifest.chunks.values());
        const totalChunks = chunks.length;
        let completedChunks = 0;

        for (const chunkInfo of chunks) {
            try {
                const data = await this.chunkDownloader.downloadChunk(chunkInfo, mirror, (downloaded) => {
                    this.downloadProgress.downloaded = downloaded;
                    if (onProgress) {
                        onProgress({
                            phase: 'downloading',
                            progress: Math.round((this.downloadProgress.downloaded / this.downloadProgress.total) * 100),
                            downloaded: this.downloadProgress.downloaded,
                            total: this.downloadProgress.total,
                            currentChunk: chunkInfo.hash.substring(0, 8),
                            completedChunks,
                            totalChunks
                        });
                    }
                });

                this.chunkCache.set(chunkInfo.hash, data);
                completedChunks++;
                
            } catch (error) {
                this.logger.error(`Failed to download chunk ${chunkInfo.hash}: ${error.message}`);
                throw error;
            }
        }

        this.logger.info('Delta download completed');
        return true;
    }

    async applyDelta(manifest, targetDir, onProgress) {
        this.logger.info('Applying delta update');
        
        return await this.deltaApplier.applyDelta(manifest, this.chunkCache, targetDir, onProgress);
    }

    async performDeltaUpdate(currentVersion, targetVersion, mirrors, targetDir, onProgress) {
        try {
            await this.initialize();

            if (onProgress) {
                onProgress({ phase: 'checking', progress: 0 });
            }

            const deltaCheck = await this.checkDeltaUpdate(currentVersion, targetVersion, mirrors);
            
            if (!deltaCheck.available) {
                this.logger.info('No delta update available, falling back to full update');
                return { success: false, reason: 'no_delta' };
            }

            if (onProgress) {
                onProgress({ 
                    phase: 'downloading', 
                    progress: 0,
                    deltaSize: deltaCheck.manifest.deltaSize,
                    totalSize: deltaCheck.manifest.totalSize,
                    savings: deltaCheck.savings
                });
            }

            await this.downloadDelta(deltaCheck.manifest, deltaCheck.mirror, onProgress);

            if (onProgress) {
                onProgress({ phase: 'applying', progress: 0 });
            }

            await this.applyDelta(deltaCheck.manifest, targetDir, onProgress);

            if (onProgress) {
                onProgress({ phase: 'completed', progress: 100 });
            }

            return {
                success: true,
                savings: deltaCheck.savings,
                downloadedSize: deltaCheck.manifest.deltaSize,
                totalSize: deltaCheck.manifest.totalSize
            };
        } catch (error) {
            this.logger.error('Delta update failed:', error);
            return { success: false, reason: error.message };
        }
    }

    cleanup() {
        this.chunkCache.clear();
        
        if (fs.existsSync(this.tempDir)) {
            try {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
                this.logger.info('Delta temp directory cleaned');
            } catch (error) {
                this.logger.warn('Failed to clean delta temp directory:', error.message);
            }
        }
    }

    getProgress() {
        return { ...this.downloadProgress };
    }
}

module.exports = {
    DeltaUpdater,
    DeltaManifest,
    DeltaBuilder,
    DeltaApplier,
    ChunkDownloader,
    DELTA_CONFIG
};
