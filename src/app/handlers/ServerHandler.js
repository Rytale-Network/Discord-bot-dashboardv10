const { ipcMain } = require('electron');

class ServerHandler {
    constructor(discordBot) {
        this.discordBot = discordBot;
        this.setupHandlers();
    }

    setupHandlers() {
        ipcMain.handle('get-servers', () => this.discordBot.getServers());
        ipcMain.handle('get-server-details', (_, serverId) => this.discordBot.getServerDetails(serverId));
    }
}

module.exports = ServerHandler;
