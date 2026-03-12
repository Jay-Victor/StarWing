const { app, BrowserWindow, Menu, Tray, nativeImage, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let updateManager = null;

function setupSecurityPolicy() {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com blob: data:",
                    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                    "img-src 'self' data: blob: https://cdn.jsdelivr.net mediastream:",
                    "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://*.googleapis.com https://*.googleusercontent.com https://storage.googleapis.com https://api.github.com https://gitee.com",
                    "media-src 'self' blob: mediastream:",
                    "worker-src 'self' blob:",
                    "font-src 'self' data:",
                    "child-src 'self' blob:",
                    "object-src 'self' blob:",
                    "frame-src 'self' blob:"
                ].join('; ')
            }
        });
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = [
            'media', 
            'notifications', 
            'fullscreen', 
            'clipboard-read', 
            'accessibility-events',
            'mediaKeySystem'
        ];
        if (allowedPermissions.includes(permission)) {
            console.log('[StarWing] Permission granted:', permission);
            callback(true);
        } else {
            console.log('[StarWing] Permission denied:', permission);
            callback(false);
        }
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        console.log('[StarWing] Permission check:', permission);
        return true;
    });

    app.on('browser-window-created', (_, window) => {
        window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
            console.log('[StarWing] Window permission request:', permission);
            callback(true);
        });
    });
}

function createWindow() {
    const iconPath = path.join(__dirname, '..', 'assets', 'logo', 'logo.ico');
    let icon = null;
    
    if (fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'StarWing - 飞机大战',
        icon: icon,
        backgroundColor: '#0a0a1a',
        show: false,
        backgroundThrottling: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            allowRunningInsecureContent: true,
            preload: path.join(__dirname, 'preload.js'),
            allowFileAccess: true,
            enableWebSQL: false,
            spellcheck: false,
            enablePreferredSizeMode: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('[StarWing] Application started successfully');
    });

    mainWindow.webContents.on('did-start-loading', () => {
        console.log('[StarWing] Loading page...');
    });

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[StarWing] Page loaded successfully');
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('minimize', (event) => {
        console.log('[StarWing] Window minimized');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[StarWing] Failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    createMenu();
    createTray();
}

function createMenu() {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '重新开始',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.reload();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '全屏',
                    accelerator: 'F11',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.setFullScreen(!mainWindow.isFullScreen());
                        }
                    }
                },
                {
                    label: '开发者工具',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '放大',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        if (mainWindow) {
                            const zoom = mainWindow.webContents.getZoomFactor();
                            mainWindow.webContents.setZoomFactor(Math.min(zoom + 0.1, 2));
                        }
                    }
                },
                {
                    label: '缩小',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        if (mainWindow) {
                            const zoom = mainWindow.webContents.getZoomFactor();
                            mainWindow.webContents.setZoomFactor(Math.max(zoom - 0.1, 0.5));
                        }
                    }
                },
                {
                    label: '重置缩放',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.setZoomFactor(1);
                        }
                    }
                }
            ]
        },
        {
            label: '游戏',
            submenu: [
                {
                    label: '暂停/继续',
                    accelerator: 'P',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('game-control', 'pause');
                        }
                    }
                },
                {
                    label: '返回主菜单',
                    accelerator: 'Escape',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('game-control', 'menu');
                        }
                    }
                }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '检查更新...',
                    click: async () => {
                        if (updateManager) {
                            try {
                                const result = await updateManager.checkForUpdates();
                                if (result.hasUpdate) {
                                    updateManager.showUpdateNotification(result);
                                } else {
                                    const { dialog } = require('electron');
                                    dialog.showMessageBox(mainWindow, {
                                        type: 'info',
                                        title: '检查更新',
                                        message: '已是最新版本',
                                        detail: `当前版本: ${result.currentVersion}\n最新版本: ${result.latestVersion}`
                                    });
                                }
                            } catch (error) {
                                const { dialog } = require('electron');
                                dialog.showErrorBox('检查更新失败', error.message);
                            }
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '关于 StarWing',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于 StarWing',
                            message: 'StarWing - 飞机大战',
                            detail: '版本: 1.1.0\n作者: Jay-Victor\n\nGitHub: https://github.com/Jay-Victor/StarWing\nGitee:  https://gitee.com/Jay-Victor/star-wing\n\n一款基于HTML5 Canvas的飞机射击游戏，支持键盘、鼠标和手势操控。\n\n新增增量更新功能，大幅减少更新下载时间！',
                            buttons: ['确定', '访问GitHub', '访问Gitee'],
                            defaultId: 0
                        }).then(result => {
                            if (result.response === 1) {
                                shell.openExternal('https://github.com/Jay-Victor/StarWing');
                            } else if (result.response === 2) {
                                shell.openExternal('https://gitee.com/Jay-Victor/star-wing');
                            }
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createTray() {
    const iconPath = path.join(__dirname, '..', 'assets', 'logo', 'logo.ico');
    let icon = null;
    
    if (fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
    }

    if (icon) {
        tray = new Tray(icon.resize({ width: 16, height: 16 }));
    } else {
        return;
    }

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示游戏',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: '全屏模式',
            click: () => {
                if (mainWindow) {
                    mainWindow.setFullScreen(true);
                }
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setToolTip('StarWing - 飞机大战');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

app.whenReady().then(() => {
    console.log('[StarWing] Initializing application...');
    setupSecurityPolicy();
    createWindow();
    
    updateManager = require('./updater').updateManager;
    updateManager.startAutoCheck();
    
    setTimeout(async () => {
        try {
            const result = await updateManager.checkForUpdates();
            if (result.hasUpdate) {
                updateManager.showUpdateNotification(result);
            }
        } catch (error) {
            console.log('[StarWing] Initial update check failed:', error.message);
        }
    }, 5000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    console.log('[StarWing] Application closing...');
});

process.on('uncaughtException', (error) => {
    console.error('[StarWing] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[StarWing] Unhandled rejection at:', promise, 'reason:', reason);
});
