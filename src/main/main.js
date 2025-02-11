
    
    
    const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Add performance optimizations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-tcp-fast-open');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            experimentalFeatures: true,
            enableBlinkFeatures: 'PrefetchDNSOnLinkHover',
            devTools: true,
            enableRemoteModule: true
        }
    });
    // Open DevTools on start
//    mainWindow.webContents.openDevTools();

    // Add performance configuration
    mainWindow.webContents.session.setMaxListeners(25);

    mainWindow.loadFile('src/renderer/index.html');

    // Window control handlers
    ipcMain.on('minimize-window', () => {
        mainWindow.minimize();
    });

    ipcMain.on('maximize-window', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
        // Send the new window state to the renderer
        mainWindow.webContents.send('window-state-change', mainWindow.isMaximized());
    });

    ipcMain.on('close-window', () => {
        mainWindow.close();
    });

    // Listen for window maximize/unmaximize events
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-state-change', true);
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-state-change', false);
    });
}

// Handle settings window
function createSettingsWindow() {
    const settingsWindow = new BrowserWindow({
        width: 600,
        height: 400,
        parent: BrowserWindow.getFocusedWindow(),
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    settingsWindow.loadFile('src/renderer/settings.html');
}

// Add memory optimization
setInterval(() => {
    if (global.gc) global.gc();
}, 5000);

app.on('web-contents-created', (event, contents) => {
    contents.on('did-finish-load', () => {
        contents.session.clearCache();
    });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers
ipcMain.on('open-settings', () => {
    createSettingsWindow();
});

