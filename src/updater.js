const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { DeltaUpdater } = require('./deltaUpdater');

const GITHUB_REPO = 'Jay-Victor/StarWing';
const GITEE_REPO = 'Jay-Victor/star-wing';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const GITEE_API_URL = `https://gitee.com/api/v5/repos/${GITEE_REPO}/releases/latest`;

const UPDATE_CONFIG = {
    checkInterval: 24 * 60 * 60 * 1000,
    autoCheckEnabled: true,
    silentUpdate: false,
    backupEnabled: true,
    backupPath: 'backup',
    downloadTimeout: 300000,
    chunkSize: 5 * 1024 * 1024,
    maxRetries: 3,
    retryDelay: 5000,
    mirrors: [
        { name: 'GitHub', type: 'github', priority: 1 },
        { name: 'Gitee直连', type: 'gitee', priority: 2 },
        { name: '国内CDN', type: 'cdn', priority: 3, url: 'https://cdn.jsdelivr.net/gh/Jay-Victor/StarWing@latest/' }
    ],
    deltaUpdateEnabled: true,
    deltaMinSize: 1024 * 1024,
    preferDelta: true
};

class UpdateLogger {
    constructor(logPath) {
        this.logPath = logPath || path.join(app.getPath('userData'), 'update-logs');
        this.currentLogFile = path.join(this.logPath, `update-${this.getDateString()}.log`);
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
    }

    getDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    formatMessage(level, message, details = null) {
        const timestamp = new Date().toISOString();
        let logLine = `[${timestamp}] [${level}] ${message}`;
        if (details) {
            logLine += `\n  Details: ${JSON.stringify(details, null, 2)}`;
        }
        if (details && details.stack) {
            logLine += `\n  Stack: ${details.stack}`;
        }
        return logLine;
    }

    log(level, message, details = null) {
        const logLine = this.formatMessage(level, message, details);
        console.log(logLine);
        try {
            fs.appendFileSync(this.currentLogFile, logLine + '\n');
        } catch (e) {
            console.error('Failed to write log:', e);
        }
    }

    info(message, details = null) { this.log('INFO', message, details); }
    warn(message, details = null) { this.log('WARN', message, details); }
    error(message, details = null) { this.log('ERROR', message, details); }
    debug(message, details = null) { this.log('DEBUG', message, details); }
}

class UpdateChecker {
    constructor(updater) {
        this.updater = updater;
        this.logger = updater.logger;
    }

    async fetchWithTimeout(url, options = {}, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);

            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const req = protocol.request(url, options, (res) => {
                clearTimeout(timeoutId);
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ data, statusCode: res.statusCode, headers: res.headers });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(err);
            });

            req.end();
        });
    }

    async fetchGitHubRelease() {
        this.logger.info('Fetching release info from GitHub API');
        try {
            const response = await this.fetchWithTimeout(GITHUB_API_URL, {
                headers: {
                    'User-Agent': 'StarWing-Updater/1.0',
                    'Accept': 'application/vnd.github.v3+json'
                }
            }, 15000);

            const release = JSON.parse(response.data);
            return this.parseReleaseInfo(release, 'github');
        } catch (error) {
            this.logger.warn('GitHub API fetch failed, trying Gitee mirror', { error: error.message });
            return await this.fetchGiteeRelease();
        }
    }

    async fetchGiteeRelease() {
        this.logger.info('Fetching release info from Gitee API');
        try {
            const response = await this.fetchWithTimeout(GITEE_API_URL, {
                headers: {
                    'User-Agent': 'StarWing-Updater/1.0'
                }
            }, 15000);

            const release = JSON.parse(response.data);
            return this.parseReleaseInfo(release, 'gitee');
        } catch (error) {
            this.logger.error('Gitee API fetch failed', { error: error.message });
            throw error;
        }
    }

    parseReleaseInfo(release, source) {
        const version = release.tag_name.replace(/^v/, '');
        const asset = release.assets.find(a => 
            a.name.endsWith('-Setup.exe') || 
            a.name.endsWith('.exe') ||
            a.name.includes('Setup')
        );

        if (!asset) {
            throw new Error('No suitable installer asset found in release');
        }

        let changelog = release.body || '';
        changelog = this.parseMarkdown(changelog);

        return {
            version,
            releaseDate: release.published_at || release.created_at,
            downloadUrl: asset.browser_download_url || asset.url,
            fileName: asset.name,
            fileSize: asset.size,
            changelog,
            source,
            releaseUrl: release.html_url,
            sha256: this.extractSha256(release.body)
        };
    }

    extractSha256(body) {
        if (!body) return null;
        const sha256Match = body.match(/SHA256[:\s]+([a-fA-F0-9]{64})/i);
        return sha256Match ? sha256Match[1] : null;
    }

    parseMarkdown(markdown) {
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/!\[(.*?)\]\((.*?)\)/gim, '')
            .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/\n/gim, '<br>');
    }

    async checkForUpdates() {
        this.logger.info('Starting update check');
        try {
            const releaseInfo = await this.fetchGitHubRelease();
            const currentVersion = app.getVersion();
            const hasUpdate = this.compareVersions(releaseInfo.version, currentVersion) > 0;

            this.logger.info(`Update check completed`, {
                currentVersion,
                latestVersion: releaseInfo.version,
                hasUpdate
            });

            return {
                hasUpdate,
                currentVersion,
                latestVersion: releaseInfo.version,
                releaseInfo,
                checkTime: Date.now()
            };
        } catch (error) {
            this.logger.error('Update check failed', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }
}

class UpdateDownloader {
    constructor(updater) {
        this.updater = updater;
        this.logger = updater.logger;
        this.downloadPath = path.join(app.getPath('temp'), 'StarWing-Update');
        this.ensureDownloadDirectory();
    }

    ensureDownloadDirectory() {
        if (!fs.existsSync(this.downloadPath)) {
            fs.mkdirSync(this.downloadPath, { recursive: true });
        }
    }

    async downloadWithProgress(url, filePath, onProgress) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const file = fs.createWriteStream(filePath);
            let downloadedBytes = 0;
            let totalBytes = 0;

            const request = protocol.get(url, {
                headers: {
                    'User-Agent': 'StarWing-Updater/1.0'
                }
            }, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    file.close();
                    fs.unlinkSync(filePath);
                    this.downloadWithProgress(response.headers.location, filePath, onProgress)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(filePath);
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                totalBytes = parseInt(response.headers['content-length'], 10) || 0;
                this.logger.info(`Starting download: ${url}`, { totalBytes });

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (onProgress && totalBytes > 0) {
                        const progress = Math.round((downloadedBytes / totalBytes) * 100);
                        onProgress({
                            progress,
                            downloadedBytes,
                            totalBytes,
                            speed: this.calculateSpeed(downloadedBytes)
                        });
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    this.logger.info('Download completed', { filePath, totalBytes: downloadedBytes });
                    resolve(filePath);
                });
            });

            request.on('error', (err) => {
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                this.logger.error('Download error', { error: err.message });
                reject(err);
            });

            request.setTimeout(UPDATE_CONFIG.downloadTimeout, () => {
                request.destroy();
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                reject(new Error('Download timeout'));
            });
        });
    }

    calculateSpeed(downloadedBytes) {
        if (!this.downloadStartTime) {
            this.downloadStartTime = Date.now();
            return 0;
        }
        const elapsed = (Date.now() - this.downloadStartTime) / 1000;
        return elapsed > 0 ? Math.round(downloadedBytes / elapsed) : 0;
    }

    async downloadFromMirrors(releaseInfo, onProgress) {
        const fileName = releaseInfo.fileName || `StarWing-${releaseInfo.version}-Setup.exe`;
        const filePath = path.join(this.downloadPath, fileName);

        const mirrors = UPDATE_CONFIG.mirrors.sort((a, b) => a.priority - b.priority);
        let lastError = null;

        for (const mirror of mirrors) {
            try {
                this.logger.info(`Trying download from ${mirror.name}`);
                let downloadUrl = releaseInfo.downloadUrl;

                if (mirror.type === 'gitee') {
                    if (downloadUrl.includes('github.com')) {
                        downloadUrl = downloadUrl
                            .replace('github.com/Jay-Victor/StarWing', 'gitee.com/Jay-Victor/star-wing')
                            .replace('github.com', 'gitee.com');
                    }
                } else if (mirror.type === 'cdn' && mirror.url) {
                    downloadUrl = `${mirror.url}releases/download/v${releaseInfo.version}/${fileName}`;
                }

                this.downloadStartTime = Date.now();
                await this.downloadWithProgress(downloadUrl, filePath, onProgress);
                return filePath;
            } catch (error) {
                lastError = error;
                this.logger.warn(`Download from ${mirror.name} failed`, { error: error.message });
                continue;
            }
        }

        throw lastError || new Error('All download mirrors failed');
    }

    async calculateSHA256(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    verifyFile(filePath, expectedSha256) {
        if (!expectedSha256) {
            this.logger.warn('No SHA256 provided, skipping verification');
            return true;
        }

        const actualSha256 = this.calculateSHA256Sync(filePath);
        const isValid = actualSha256.toLowerCase() === expectedSha256.toLowerCase();
        
        this.logger.info('File verification', {
            expected: expectedSha256,
            actual: actualSha256,
            isValid
        });

        return isValid;
    }

    calculateSHA256Sync(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256');
        hash.update(fileBuffer);
        return hash.digest('hex');
    }
}

class BackupManager {
    constructor(updater) {
        this.updater = updater;
        this.logger = updater.logger;
        this.backupPath = path.join(path.dirname(app.getPath('exe')), UPDATE_CONFIG.backupPath);
    }

    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupPath)) {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }
    }

    async createBackup(files) {
        this.ensureBackupDirectory();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.backupPath, `backup-${timestamp}`);

        try {
            fs.mkdirSync(backupDir, { recursive: true });

            for (const file of files) {
                if (fs.existsSync(file)) {
                    const fileName = path.basename(file);
                    const destPath = path.join(backupDir, fileName);
                    fs.copyFileSync(file, destPath);
                    this.logger.info(`Backed up: ${fileName}`);
                }
            }

            this.logger.info('Backup created successfully', { backupDir });
            return backupDir;
        } catch (error) {
            this.logger.error('Backup creation failed', { error: error.message });
            throw error;
        }
    }

    async restoreBackup(backupDir) {
        try {
            const files = fs.readdirSync(backupDir);
            const appDir = path.dirname(app.getPath('exe'));

            for (const file of files) {
                const srcPath = path.join(backupDir, file);
                const destPath = path.join(appDir, file);
                fs.copyFileSync(srcPath, destPath);
                this.logger.info(`Restored: ${file}`);
            }

            this.logger.info('Backup restored successfully');
        } catch (error) {
            this.logger.error('Backup restoration failed', { error: error.message });
            throw error;
        }
    }

    cleanOldBackups(maxCount = 5) {
        try {
            if (!fs.existsSync(this.backupPath)) return;

            const backups = fs.readdirSync(this.backupPath)
                .filter(name => name.startsWith('backup-'))
                .sort()
                .reverse();

            if (backups.length > maxCount) {
                const toDelete = backups.slice(maxCount);
                for (const backup of toDelete) {
                    const backupDir = path.join(this.backupPath, backup);
                    fs.rmSync(backupDir, { recursive: true, force: true });
                    this.logger.info(`Deleted old backup: ${backup}`);
                }
            }
        } catch (error) {
            this.logger.warn('Failed to clean old backups', { error: error.message });
        }
    }
}

class UpdateManager {
    constructor() {
        this.logger = new UpdateLogger();
        this.checker = new UpdateChecker(this);
        this.downloader = new UpdateDownloader(this);
        this.backupManager = new BackupManager(this);
        this.deltaUpdater = new DeltaUpdater(this.logger);
        this.updateWindow = null;
        this.lastCheckTime = null;
        this.checkIntervalId = null;
        this.isUpdating = false;
        this.deltaUpdateInfo = null;

        this.setupIpcHandlers();
        this.loadConfig();
    }

    loadConfig() {
        const configPath = path.join(app.getPath('userData'), 'update-config.json');
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                Object.assign(UPDATE_CONFIG, config);
                this.logger.info('Loaded update config', { configPath });
            }
        } catch (error) {
            this.logger.warn('Failed to load update config, using defaults', { error: error.message });
        }
    }

    saveConfig() {
        const configPath = path.join(app.getPath('userData'), 'update-config.json');
        try {
            fs.writeFileSync(configPath, JSON.stringify(UPDATE_CONFIG, null, 2));
            this.logger.info('Saved update config');
        } catch (error) {
            this.logger.error('Failed to save update config', { error: error.message });
        }
    }

    setupIpcHandlers() {
        ipcMain.handle('update:check', async () => {
            return await this.checkForUpdates();
        });

        ipcMain.handle('update:download', async (event, releaseInfo) => {
            return await this.downloadUpdate(releaseInfo, (progress) => {
                event.sender.send('update:download-progress', progress);
            });
        });

        ipcMain.handle('update:install', async (event, filePath) => {
            return await this.installUpdate(filePath);
        });

        ipcMain.handle('update:get-config', () => {
            return UPDATE_CONFIG;
        });

        ipcMain.handle('update:set-config', (event, config) => {
            Object.assign(UPDATE_CONFIG, config);
            this.saveConfig();
            return UPDATE_CONFIG;
        });

        ipcMain.handle('update:get-last-check', () => {
            return this.lastCheckTime;
        });

        ipcMain.handle('update:check-delta', async (event, currentVersion, targetVersion) => {
            return await this.checkDeltaUpdate(currentVersion, targetVersion);
        });

        ipcMain.handle('update:download-delta', async (event, currentVersion, targetVersion) => {
            return await this.downloadDeltaUpdate(currentVersion, targetVersion, (progress) => {
                event.sender.send('update:delta-progress', progress);
            });
        });

        ipcMain.on('update:close', () => {
            if (this.updateWindow && !this.updateWindow.isDestroyed()) {
                this.updateWindow.close();
                this.updateWindow = null;
            }
        });

        ipcMain.on('update:minimize', () => {
            if (this.updateWindow && !this.updateWindow.isDestroyed()) {
                this.updateWindow.minimize();
            }
        });

        ipcMain.on('update:later', () => {
            if (this.updateWindow && !this.updateWindow.isDestroyed()) {
                this.updateWindow.close();
                this.updateWindow = null;
            }
        });
    }

    async checkForUpdates() {
        try {
            const result = await this.checker.checkForUpdates();
            this.lastCheckTime = Date.now();
            
            if (result.hasUpdate && UPDATE_CONFIG.deltaUpdateEnabled) {
                const deltaResult = await this.checkDeltaUpdate(
                    result.currentVersion, 
                    result.latestVersion
                );
                result.deltaUpdate = deltaResult;
            }
            
            return result;
        } catch (error) {
            this.logger.error('Update check failed', { error: error.message });
            throw error;
        }
    }

    async checkDeltaUpdate(currentVersion, targetVersion) {
        if (!UPDATE_CONFIG.deltaUpdateEnabled) {
            return { available: false, reason: 'delta_disabled' };
        }

        try {
            this.logger.info(`Checking delta update: ${currentVersion} -> ${targetVersion}`);
            
            const result = await this.deltaUpdater.checkDeltaUpdate(
                currentVersion,
                targetVersion,
                UPDATE_CONFIG.mirrors
            );

            if (result.available) {
                this.deltaUpdateInfo = result;
                this.logger.info('Delta update available', {
                    savings: result.savings + '%',
                    deltaSize: result.manifest.deltaSize,
                    totalSize: result.manifest.totalSize
                });
            }

            return result;
        } catch (error) {
            this.logger.warn('Delta check failed', { error: error.message });
            return { available: false, reason: error.message };
        }
    }

    async downloadDeltaUpdate(currentVersion, targetVersion, onProgress) {
        if (!this.deltaUpdateInfo || !this.deltaUpdateInfo.available) {
            throw new Error('No delta update available');
        }

        this.isUpdating = true;
        this.logger.info('Starting delta download');

        try {
            const result = await this.deltaUpdater.performDeltaUpdate(
                currentVersion,
                targetVersion,
                UPDATE_CONFIG.mirrors,
                path.join(app.getPath('temp'), 'StarWing-Delta'),
                onProgress
            );

            if (result.success) {
                this.logger.info('Delta update downloaded successfully', {
                    savings: result.savings + '%',
                    downloadedSize: result.downloadedSize
                });
            }

            return result;
        } catch (error) {
            this.logger.error('Delta download failed', { error: error.message });
            throw error;
        } finally {
            this.isUpdating = false;
        }
    }

    async downloadUpdate(releaseInfo, onProgress) {
        if (this.isUpdating) {
            throw new Error('Update already in progress');
        }

        this.isUpdating = true;
        this.logger.info('Starting update download', { version: releaseInfo.version });

        try {
            const filePath = await this.downloader.downloadFromMirrors(releaseInfo, onProgress);

            if (releaseInfo.sha256 && !this.downloader.verifyFile(filePath, releaseInfo.sha256)) {
                throw new Error('File verification failed: SHA256 mismatch');
            }

            this.logger.info('Update downloaded and verified', { filePath });
            return filePath;
        } catch (error) {
            this.logger.error('Update download failed', { error: error.message });
            throw error;
        } finally {
            this.isUpdating = false;
        }
    }

    async installUpdate(filePath) {
        this.logger.info('Starting update installation', { filePath });

        try {
            if (UPDATE_CONFIG.backupEnabled) {
                const appDir = path.dirname(app.getPath('exe'));
                const criticalFiles = [
                    path.join(appDir, 'StarWing.exe'),
                    path.join(appDir, 'resources', 'app.asar')
                ].filter(f => fs.existsSync(f));

                await this.backupManager.createBackup(criticalFiles);
                this.backupManager.cleanOldBackups();
            }

            this.logger.info('Launching installer and quitting app');
            shell.openPath(filePath);
            
            setTimeout(() => {
                app.quit();
            }, 1000);

            return { success: true };
        } catch (error) {
            this.logger.error('Update installation failed', { error: error.message });
            throw error;
        }
    }

    startAutoCheck() {
        if (!UPDATE_CONFIG.autoCheckEnabled) return;

        this.checkIntervalId = setInterval(async () => {
            try {
                const result = await this.checkForUpdates();
                if (result.hasUpdate) {
                    this.showUpdateNotification(result);
                }
            } catch (error) {
                this.logger.warn('Auto update check failed', { error: error.message });
            }
        }, UPDATE_CONFIG.checkInterval);

        this.logger.info('Auto update check started', {
            interval: UPDATE_CONFIG.checkInterval
        });
    }

    stopAutoCheck() {
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
            this.logger.info('Auto update check stopped');
        }
    }

    showUpdateNotification(result) {
        if (this.updateWindow && !this.updateWindow.isDestroyed()) {
            this.updateWindow.focus();
            return;
        }

        this.createUpdateWindow(result);
    }

    createUpdateWindow(updateInfo) {
        const isDev = !app.isPackaged;
        const preloadPath = isDev 
            ? path.join(__dirname, 'updaterPreload.js')
            : path.join(process.resourcesPath, 'updaterPreload.js');

        const updateWindow = new BrowserWindow({
            width: 600,
            height: 500,
            minWidth: 500,
            minHeight: 400,
            frame: false,
            transparent: true,
            resizable: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: preloadPath
            },
            icon: path.join(__dirname, '..', 'assets', 'logo', 'logo.ico'),
            title: 'StarWing 更新'
        });

        const updaterUIPath = isDev 
            ? path.join(__dirname, 'updaterUI.html')
            : path.join(process.resourcesPath, 'updaterUI.html');
        
        updateWindow.loadFile(updaterUIPath);

        updateWindow.webContents.on('did-finish-load', () => {
            updateWindow.webContents.send('update:info', updateInfo);
        });

        this.updateWindow = updateWindow;
        return updateWindow;
    }
}

const updateManager = new UpdateManager();

module.exports = {
    UpdateManager,
    updateManager,
    UPDATE_CONFIG
};
