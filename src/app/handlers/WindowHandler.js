const { BrowserWindow } = require('electron');
const path = require('path');

class WindowHandler {
    constructor(discordBot) {
        this.discordBot = discordBot;
        this.mainWindow = null;
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload.js')
            }
        });

        this.mainWindow.loadFile(path.join(__dirname, '../renderer', 'index.html'));

        if (process.argv.includes('--dev')) {
            this.mainWindow.webContents.openDevTools();
        }

        return this.mainWindow;
    }

    setupEventForwarding() {
        if (!this.mainWindow) return;

        this.discordBot.on('statusUpdate', (status) => {
            this.mainWindow?.webContents.send('bot-status-update', status);
        });

        this.discordBot.on('serversUpdate', (servers) => {
            this.mainWindow?.webContents.send('servers-update', servers);
        });

        this.discordBot.on('log', (log) => {
            this.mainWindow?.webContents.send('log', log);
        });

        this.discordBot.on('commandsUpdate', (commands) => {
            this.mainWindow?.webContents.send('commands-update', commands);
        });
    }

    getWindow() {
        return this.mainWindow;
    }
}

module.exports = WindowHandler;
