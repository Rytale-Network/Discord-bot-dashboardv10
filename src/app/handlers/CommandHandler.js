const { ipcMain, dialog, app, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;

class CommandHandler {
    constructor(discordBot, mainWindow) {
        this.discordBot = discordBot;
        this.mainWindow = mainWindow;
        this.setupHandlers();
    }

    setupHandlers() {
        ipcMain.handle('get-commands', () => this.discordBot.getCommands());
        ipcMain.handle('get-command-help', (_, commandName) => this.discordBot.getCommandHelp(commandName));

        ipcMain.handle('reload-commands', async () => {
            try {
                const result = await this.discordBot.reloadCommands();
                if (!result) throw new Error('Failed to reload commands');
                return true;
            } catch (error) {
                this.discordBot.logger.error('Failed to reload commands', { error: error.message });
                throw error;
            }
        });

        ipcMain.handle('test-command', async (_, commandName) => {
            try {
                const result = await this.discordBot.testCommand(commandName);
                if (!result) throw new Error('Failed to test command');
                return true;
            } catch (error) {
                this.discordBot.logger.error('Failed to test command', { error: error.message });
                throw error;
            }
        });

        ipcMain.handle('import-commands', async (_, filePath, selectedCommands) => {
            try {
                const result = await this.discordBot.importCommands(filePath, selectedCommands);
                if (!result) throw new Error('Failed to import commands');
                return true;
            } catch (error) {
                this.discordBot.logger.error('Failed to import commands', { error: error.message });
                throw error;
            }
        });

        ipcMain.handle('export-commands', async (_, format, selectedCommands) => {
            try {
                const { filename, data, rawContent } = await this.discordBot.exportCommands(format, selectedCommands);
                
                this.discordBot.logger.info('Export data received:', { 
                    commandCount: Object.keys(data).length,
                    commands: Object.keys(data)
                });

                const { filePath } = await dialog.showSaveDialog(this.mainWindow, {
                    defaultPath: path.join(app.getPath('downloads'), filename),
                    filters: [
                        { name: format === 'js' ? 'JavaScript' : 'JSON', extensions: [format] }
                    ]
                });

                if (!filePath) return false;

                if (format === 'json') {
                    // For JSON format, create a collection of commands
                    const jsonData = {};
                    for (const [file, content] of Object.entries(data)) {
                        const name = path.basename(file, '.js');
                        jsonData[name] = content;
                    }
                    const jsonContent = JSON.stringify(jsonData, null, 2);
                    this.discordBot.logger.info('Writing JSON file:', { 
                        length: jsonContent.length,
                        path: filePath 
                    });
                    await fs.writeFile(filePath, jsonContent, 'utf8');
                } else {
                    // For JS format, write the raw command files directly
                    this.discordBot.logger.info('Writing JS file:', { 
                        length: rawContent.length,
                        path: filePath 
                    });
                    await fs.writeFile(filePath, rawContent, 'utf8');
                }

                await shell.openPath(path.dirname(filePath));
                return true;
            } catch (error) {
                this.discordBot.logger.error('Failed to export commands', { error: error.message });
                throw error;
            }
        });
    }
}

module.exports = CommandHandler;
