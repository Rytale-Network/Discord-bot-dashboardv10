const { ipcMain } = require('electron');

class BotHandler {
    constructor(discordBot, store) {
        this.discordBot = discordBot;
        this.store = store;
        this.mainWindow = null;
        this.setupHandlers();
        this.setupEventForwarding();
    }

    setMainWindow(window) {
        this.mainWindow = window;
    }

    setupEventForwarding() {
        // Forward bot status updates to renderer
        this.discordBot.on('statusUpdate', (status) => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('bot-status-update', status);
                // Also send server update when status changes to ensure immediate UI update
                if (status.online) {
                    const servers = this.discordBot.getServers();
                    this.mainWindow.webContents.send('servers-update', servers);
                }
            }
        });
    }

    setupHandlers() {
        ipcMain.handle('get-bot-status', () => {
            const status = this.discordBot.getStatus();
            // Also send server update when status is requested
            if (status.online && this.mainWindow) {
                const servers = this.discordBot.getServers();
                this.mainWindow.webContents.send('servers-update', servers);
            }
            return status;
        });

        ipcMain.handle('restart-bot', async () => {
            const token = this.store.get('botToken') || process.env.DISCORD_BOT_TOKEN;
            if (!token) {
                throw new Error('No bot token configured. Please set a token in the settings.');
            }
            
            try {
                const result = await this.discordBot.restart();
                if (!result) throw new Error('Bot restart failed');
                return true;
            } catch (error) {
                throw new Error('Failed to restart bot. Please verify your token is valid.');
            }
        });

        ipcMain.handle('start-bot', async () => {
            const token = this.store.get('botToken') || process.env.DISCORD_BOT_TOKEN;
            if (!token) {
                throw new Error('No bot token configured. Please set a token in the settings.');
            }
            
            try {
                const result = await this.discordBot.start(token);
                if (!result) throw new Error('Bot start failed');
                return true;
            } catch (error) {
                throw new Error('Failed to start bot. Please verify your token is valid.');
            }
        });

        ipcMain.handle('stop-bot', async () => {
            try {
                const result = await this.discordBot.stop();
                if (!result) throw new Error('Bot stop failed');
                return true;
            } catch (error) {
                throw new Error('Failed to stop bot. Please try again.');
            }
        });
    }
}

module.exports = BotHandler;
