const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const BotManager = require('../bot/core/BotManager');
const LogManager = require('../bot/core/LogManager');
require('dotenv').config();

const store = new Store();
let mainWindow = null;
const logger = new LogManager();
const discordBot = new BotManager(logger);

// Set up log directory
const logPath = path.join(app.getPath('userData'), 'logs');
logger.setLogPath(logPath);

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

// Get the bot token with proper priority
function getBotToken() {
    const storedToken = store.get('botToken');
    if (storedToken?.trim()) {
        return storedToken.trim();
    }
    
    const envToken = process.env.DISCORD_BOT_TOKEN;
    if (envToken?.trim()) {
        return envToken.trim();
    }
    
    return null;
}

// Initialize bot with stored token
async function initializeBot() {
    const token = getBotToken();
    if (token) {
        logger.info('Bot token configured, ready to start');
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

    logger.on('log', (log) => {
        if (mainWindow?.webContents) {
            mainWindow.webContents.send('log', log);
        }
    });
}

app.whenReady().then(() => {
    createWindow();
    setupEventForwarding();
    initializeBot();

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
        logger.error('Error stopping bot during shutdown');
    }
    
    if (process.platform !== 'darwin') {
        app.quit();
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
    const token = getBotToken();
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
    const token = getBotToken();
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
ipcMain.handle('get-logs', async (event, options = {}) => {
    return logger.getLogs(options);
});

ipcMain.handle('get-log-files', async () => {
    return logger.getLogFiles();
});

ipcMain.handle('get-log-path', async () => {
    return logPath;
});

ipcMain.handle('open-log-directory', async () => {
    try {
        await shell.openPath(logPath);
        return true;
    } catch (error) {
        logger.error('Failed to open log directory', { error: error.message });
        throw new Error('Failed to open log directory');
    }
});

ipcMain.handle('export-logs', async (event, filename, options = {}) => {
    try {
        logger.info('Exporting logs', { filename, ...options });
        const exportPath = path.join(app.getPath('downloads'), filename);
        await logger.saveLogsToFile(exportPath, options);
        
        // Log success and open the downloads folder
        logger.info('Logs exported successfully', { path: exportPath });
        await shell.openPath(path.dirname(exportPath));
        
        return true;
    } catch (error) {
        logger.error('Failed to export logs', { error: error.message });
        throw new Error('Failed to export logs');
    }
});

ipcMain.handle('save-logs', async () => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `bot-logs-${timestamp}.log`;
        const savePath = path.join(logPath, filename);
        await logger.saveLogsToFile(savePath);
        logger.info('Logs saved successfully', { path: savePath });
        return true;
    } catch (error) {
        logger.error('Failed to save logs', { error: error.message });
        throw new Error('Failed to save logs');
    }
});

// Error handling
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message });
    mainWindow?.webContents.send('error', {
        type: 'uncaughtException',
        message: error.message
    });
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection', { error: error.message });
    mainWindow?.webContents.send('error', {
        type: 'unhandledRejection',
        message: error.message
    });
});
