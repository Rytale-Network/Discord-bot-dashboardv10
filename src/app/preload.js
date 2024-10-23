const { contextBridge, ipcRenderer } = require('electron');

// Listen for events from main process
const listeners = new Set();

const addListener = (channel, callback) => {
    const wrappedCallback = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, wrappedCallback);
    listeners.add({ channel, callback: wrappedCallback });
    
    // Return cleanup function
    return () => {
        ipcRenderer.removeListener(channel, wrappedCallback);
        listeners.delete({ channel, callback: wrappedCallback });
    };
};

// Clean up listeners when window unloads
window.addEventListener('unload', () => {
    listeners.forEach(({ channel, callback }) => {
        ipcRenderer.removeListener(channel, callback);
    });
    listeners.clear();
});

// Expose protected methods that allow the renderer process to use
contextBridge.exposeInMainWorld('electronAPI', {
    // Bot management
    getServers: () => ipcRenderer.invoke('get-servers'),
    getServerDetails: (serverId) => ipcRenderer.invoke('get-server-details', serverId),
    getBotStatus: () => ipcRenderer.invoke('get-bot-status'),
    startBot: () => ipcRenderer.invoke('start-bot'),
    stopBot: () => ipcRenderer.invoke('stop-bot'),
    restartBot: () => ipcRenderer.invoke('restart-bot'),
    updateBotPresence: (presenceData) => ipcRenderer.invoke('update-bot-presence', presenceData),
    
    // Command management
    getCommands: () => ipcRenderer.invoke('get-commands'),
    getCommandHelp: (commandName) => ipcRenderer.invoke('get-command-help', commandName),
    reloadCommands: () => ipcRenderer.invoke('reload-commands'),
    testCommand: (commandName) => ipcRenderer.invoke('test-command', commandName),
    importCommands: (filePath, selectedCommands) => ipcRenderer.invoke('import-commands', filePath, selectedCommands),
    exportCommands: (format, selectedCommands) => ipcRenderer.invoke('export-commands', format, selectedCommands),
    
    // Settings management
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    getAllSettings: () => ipcRenderer.invoke('get-all-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    
    // Log management
    getLogs: (options) => ipcRenderer.invoke('get-logs', options),
    getLogFiles: () => ipcRenderer.invoke('get-log-files'),
    exportLogs: (filename, options) => ipcRenderer.invoke('export-logs', filename, options),
    saveLogs: () => ipcRenderer.invoke('save-logs'),
    getLogPath: () => ipcRenderer.invoke('get-log-path'),
    openLogDirectory: () => ipcRenderer.invoke('open-log-directory'),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    
    // Event listeners
    onBotStatusUpdate: (callback) => addListener('bot-status-update', callback),
    onServersUpdate: (callback) => addListener('servers-update', callback),
    onError: (callback) => addListener('error', callback),
    onLog: (callback) => addListener('log', callback),
    onCommandsUpdate: (callback) => addListener('commands-update', callback),
    onSettingsUpdate: (callback) => addListener('settings-update', callback)
});
