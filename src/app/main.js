const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const discordBot = require('./services/discord-bot');
require('dotenv').config();

const store = new Store();
let mainWindow = null;

// Initialize bot service immediately
discordBot.initialize();

// Set up log directory
const logPath = path.join(app.getPath('userData'), 'logs');
discordBot.logger.setLogPath(logPath);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

// Initialize bot with stored token
async function initializeBot() {
    try {
        const token = store.get('botToken') || process.env.DISCORD_BOT_TOKEN;
        if (token) {
            discordBot.logger.info('Bot token configured, ready to start');
            // Optionally auto-start the bot
            if (store.get('autoStart', false)) {
                await discordBot.start(token);
            }
        }
    } catch (error) {
        discordBot.logger.error('Failed to initialize bot', { error: error.message });
    }
}

// Set up event forwarding
function setupEventForwarding() {
    discordBot.on('statusUpdate', (status) => {
        if (mainWindow?.webContents) {
            mainWindow.webContents.send('bot-status-update', status);
        }
    });

    discordBot.on('serversUpdate', (servers) => {
        if (mainWindow?.webContents) {
            mainWindow.webContents.send('servers-update', servers);
        }
    });

    discordBot.on('log', (log) => {
        if (mainWindow?.webContents) {
            mainWindow.webContents.send('log', log);
        }
    });

    // Forward command updates
    discordBot.on('commandsUpdate', (commands) => {
        if (mainWindow?.webContents) {
            mainWindow.webContents.send('commands-update', commands);
        }
    });
}

app.whenReady().then(async () => {
    createWindow();
    setupEventForwarding();
    await initializeBot();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', async () => {
    try {
        await discordBot.stop();
    } catch (error) {
        discordBot.logger.error('Error stopping bot during shutdown');
    }
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Command management
ipcMain.handle('get-commands', async () => {
    return discordBot.getCommands();
});

ipcMain.handle('get-command-help', async (event, commandName) => {
    return discordBot.getCommandHelp(commandName);
});

ipcMain.handle('reload-commands', async () => {
    try {
        const result = await discordBot.reloadCommands();
        if (!result) {
            throw new Error('Failed to reload commands');
        }
        return true;
    } catch (error) {
        discordBot.logger.error('Failed to reload commands', { error: error.message });
        throw error;
    }
});

// Settings management
ipcMain.handle('get-setting', async (event, key) => {
    return store.get(key);
});

ipcMain.handle('set-setting', async (event, key, value) => {
    store.set(key, value);
    
    if (key === 'botToken' && value?.trim()) {
        try {
            const status = discordBot.getStatus();
            if (status.online) {
                await discordBot.stop();
                await discordBot.start(value.trim());
            }
        } catch (error) {
            throw new Error('Failed to start bot with new token. Please verify the token is valid.');
        }
    }
    
    return true;
});

// Bot status management
ipcMain.handle('get-bot-status', async () => {
    return discordBot.getStatus();
});

// Server management
ipcMain.handle('get-servers', async () => {
    return discordBot.getServers();
});

ipcMain.handle('get-server-details', async (event, serverId) => {
    return discordBot.getServerDetails(serverId);
});

// Bot control
ipcMain.handle('restart-bot', async () => {
    const token = store.get('botToken') || process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        throw new Error('No bot token configured. Please set a token in the settings.');
    }
    
    try {
        const result = await discordBot.restart();
        if (!result) {
            throw new Error('Bot restart failed');
        }
        return true;
    } catch (error) {
        throw new Error('Failed to restart bot. Please verify your token is valid.');
    }
});

ipcMain.handle('start-bot', async () => {
    const token = store.get('botToken') || process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        throw new Error('No bot token configured. Please set a token in the settings.');
    }
    
    try {
        const result = await discordBot.start(token);
        if (!result) {
            throw new Error('Bot start failed');
        }
        return true;
    } catch (error) {
        throw new Error('Failed to start bot. Please verify your token is valid.');
    }
});

ipcMain.handle('stop-bot', async () => {
    try {
        const result = await discordBot.stop();
        if (!result) {
            throw new Error('Bot stop failed');
        }
        return true;
    } catch (error) {
        throw new Error('Failed to stop bot. Please try again.');
    }
});

// Log management
ipcMain.handle('get-logs', async (event, options) => {
    return discordBot.logger.getLogs(options);
});

ipcMain.handle('get-log-files', async () => {
    return discordBot.logger.getLogFiles();
});

ipcMain.handle('get-log-path', async () => {
    return logPath;
});

ipcMain.handle('get-user-data-path', async () => {
    return app.getPath('userData');
});

ipcMain.handle('open-log-directory', async () => {
    try {
        await shell.openPath(logPath);
        return true;
    } catch (error) {
        discordBot.logger.error('Failed to open log directory', { error: error.message });
        throw new Error('Failed to open log directory');
    }
});

ipcMain.handle('export-logs', async (event, filename, options = {}) => {
    try {
        const exportPath = path.join(app.getPath('downloads'), filename);
        await discordBot.logger.saveLogsToFile(exportPath, options);
        await shell.openPath(path.dirname(exportPath));
        return true;
    } catch (error) {
        discordBot.logger.error('Failed to export logs', { error: error.message });
        throw new Error('Failed to export logs');
    }
});

ipcMain.handle('save-logs', async () => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `bot-logs-${timestamp}.log`;
        const savePath = path.join(logPath, filename);
        await discordBot.logger.saveLogsToFile(savePath);
        return true;
    } catch (error) {
        discordBot.logger.error('Failed to save logs', { error: error.message });
        throw new Error('Failed to save logs');
    }
});

// Error handling
process.on('uncaughtException', (error) => {
    discordBot.logger.error('Uncaught Exception', { error: error.message });
    mainWindow?.webContents.send('error', {
        type: 'uncaughtException',
        message: error.message
    });
});

process.on('unhandledRejection', (error) => {
    discordBot.logger.error('Unhandled Rejection', { error: error.message });
    mainWindow?.webContents.send('error', {
        type: 'unhandledRejection',
        message: error.message
    });
});
