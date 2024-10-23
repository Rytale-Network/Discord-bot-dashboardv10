const { ipcMain, shell } = require('electron');
const path = require('path');

class LogHandler {
    constructor(discordBot, logPath) {
        this.discordBot = discordBot;
        this.logPath = logPath;
        this.setupHandlers();
    }

    setupHandlers() {
        ipcMain.handle('get-logs', (_, options) => this.discordBot.logger.getLogs(options));
        ipcMain.handle('get-log-files', () => this.discordBot.logger.getLogFiles());
        ipcMain.handle('get-log-path', () => this.logPath);

        ipcMain.handle('open-log-directory', async () => {
            try {
                await shell.openPath(this.logPath);
                return true;
            } catch (error) {
                this.discordBot.logger.error('Failed to open log directory', { error: error.message });
                throw new Error('Failed to open log directory');
            }
        });

        ipcMain.handle('export-logs', async (_, filename, options = {}) => {
            try {
                const exportPath = path.join(app.getPath('downloads'), filename);
                await this.discordBot.logger.saveLogsToFile(exportPath, options);
                await shell.openPath(path.dirname(exportPath));
                return true;
            } catch (error) {
                this.discordBot.logger.error('Failed to export logs', { error: error.message });
                throw new Error('Failed to export logs');
            }
        });

        ipcMain.handle('save-logs', async () => {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `bot-logs-${timestamp}.log`;
                const savePath = path.join(this.logPath, filename);
                await this.discordBot.logger.saveLogsToFile(savePath);
                return true;
            } catch (error) {
                this.discordBot.logger.error('Failed to save logs', { error: error.message });
                throw new Error('Failed to save logs');
            }
        });
    }
}

module.exports = LogHandler;
