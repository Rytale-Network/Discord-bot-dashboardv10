const { ipcMain } = require('electron');

class SettingsHandler {
    constructor(discordBot, store) {
        this.discordBot = discordBot;
        this.store = store;
        this.setupHandlers();
    }

    setupHandlers() {
        ipcMain.handle('get-setting', (_, key) => this.store.get(key));

        ipcMain.handle('set-setting', async (_, key, value) => {
            this.store.set(key, value);
            
            if (key === 'botToken' && value?.trim()) {
                try {
                    const status = this.discordBot.getStatus();
                    if (status.online) {
                        await this.discordBot.stop();
                        await this.discordBot.start(value.trim());
                    }
                } catch (error) {
                    throw new Error('Failed to start bot with new token. Please verify the token is valid.');
                }
            }
            
            return true;
        });
    }
}

module.exports = SettingsHandler;
