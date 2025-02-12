const { contextBridge, ipcRenderer } = require('electron');

console.log("preload.js script running"); // Add log at the beginning of preload script

if (contextBridge && ipcRenderer) { // Check if contextBridge and ipcRenderer are available
    console.log("contextBridge and ipcRenderer are available in preload.js");
    contextBridge.exposeInMainWorld('electronAPI', {
        injectCode: (code) => {
            console.log("injectCode function in preload.js called, sending ipc message"); // Log when injectCode is called in preload
            ipcRenderer.send('inject-code', code);
        }
    });
} else {
    console.error("contextBridge or ipcRenderer is not available in preload.js!");
}