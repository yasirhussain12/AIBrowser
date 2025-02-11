
    //main.js in electrol project
    
    const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require('electron');
const path = require('path');

// Add performance optimizations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-tcp-fast-open');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
//todo: to enable dev tool for my app change devtools to
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
        width: 1200,
        height: 800,
        parent: BrowserWindow.getFocusedWindow(),
        modal: true,
        autoHideMenuBar: true,  // Add this line
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
    // Clear cache on load
    contents.on('did-finish-load', () => {
        contents.session.clearCache();
    });

    // Handle webview specifically
    if (contents.getType() === 'webview') {
        // Add these to allow proper devtools
        contents.setWindowOpenHandler(({ url }) => {
            return { action: 'allow' };
        });

        // Enable dev tools for this webview
        contents.on('before-input-event', (event, input) => {
            if ((input.key === 'F12') || 
                (input.control && input.shift && input.key === 'i')) {
                contents.openDevTools({ mode: 'detach' });
            }
        });

        contents.on('context-menu', (event, params) => {
            const menu = new Menu();
            menu.append(new MenuItem({
                label: 'Inspect Element',
                click: () => {
                    contents.inspectElement(params.x, params.y);
                    contents.openDevTools({ mode: 'detach' });
                }
            }));
            menu.popup();
        });
    }
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


