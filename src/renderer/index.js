// index.js
const { ipcRenderer } = require('electron');
// Expose ipcRenderer globally so other files can use it
window.ipcRenderer = ipcRenderer;

console.log('Index.js starting...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    setupWindowControls();

    // Call the global setupTabManagement defined in tab.js
    if (typeof setupTabManagement === 'function') {
        setupTabManagement();
    } else {
        console.error('setupTabManagement is not defined');
    }
});

function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const maximizeIcon = maximizeBtn?.querySelector('.material-icons');

    if (!minimizeBtn || !maximizeBtn || !closeBtn || !settingsBtn) {
        console.error('Window control elements not found');
        return;
    }

    minimizeBtn.addEventListener('click', () => ipcRenderer.send('minimize-window'));
    maximizeBtn.addEventListener('click', () => ipcRenderer.send('maximize-window'));
    closeBtn.addEventListener('click', () => ipcRenderer.send('close-window'));
    settingsBtn.addEventListener('click', () => ipcRenderer.send('open-settings'));

    // Listen for window state changes and update button/icon accordingly
    ipcRenderer.on('window-state-change', (_, isMaximized) => {
        if (maximizeIcon) {
            maximizeIcon.textContent = isMaximized ? 'filter_none' : 'crop_square';
            maximizeBtn.title = isMaximized ? 'Restore' : 'Maximize';
        }
    });
}