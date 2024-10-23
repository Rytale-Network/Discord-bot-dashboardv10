const path = require('path');
const fs = require('fs').promises;

class CommandService {
    constructor(bot, logger) {
        this.bot = bot;
        this.logger = logger;
        this.commandsDir = path.join(__dirname, '../../../bot/commands');
    }

    async reloadCommands() {
        try {
            if (!this.bot) throw new Error('Bot not initialized');

            this.logger.info('Reloading bot commands...');
            const result = await this.bot.reloadCommands();
            if (!result) throw new Error('Failed to reload commands');
            return true;
        } catch (error) {
            this._handleError('Failed to reload commands', error);
            throw error;
        }
    }

    async testCommand(commandName) {
        try {
            if (!this.bot?.client) throw new Error('Bot not initialized or not connected');

            const command = this.bot.commandManager.getCommand(commandName);
            if (!command) throw new Error(`Command ${commandName} not found`);

            this.logger.info(`Testing command: ${commandName}`);
            this.logger.info(`Command ${commandName} test successful`, {
                command: {
                    name: command.name,
                    description: command.description,
                    options: command.options,
                    metadata: command.metadata
                }
            });

            return true;
        } catch (error) {
            this._handleError('Failed to test command', error, { commandName });
            throw error;
        }
    }

    async importCommands(filePath, selectedCommands) {
        try {
            if (!this.bot) throw new Error('Bot not initialized');

            this.logger.info('Importing commands...', { filePath });

            if (filePath.endsWith('.js')) {
                await this._importJsCommand(filePath);
            } else if (filePath.endsWith('.json')) {
                await this._importJsonCommands(filePath, selectedCommands);
            } else {
                throw new Error('Unsupported file format. Please use .js or .json files.');
            }

            await this._registerCommandsWithDiscord();
            return true;
        } catch (error) {
            this._handleError('Failed to import commands', error);
            throw error;
        }
    }

    async exportCommands(format, selectedCommands) {
        try {
            if (!this.bot) throw new Error('Bot not initialized');

            const exportData = {};

            // Read the actual command files
            const files = await fs.readdir(this.commandsDir);
            this.logger.info('Found command files:', { files });

            for (const file of files) {
                if (file.endsWith('.js')) {
                    const name = path.basename(file, '.js');
                    if (!selectedCommands || selectedCommands.includes(name)) {
                        const filePath = path.join(this.commandsDir, file);
                        this.logger.info('Reading command file:', { file, filePath });
                        
                        // Read the raw file content
                        const content = await fs.readFile(filePath, 'utf8');
                        this.logger.info('Command content length:', { file, length: content.length });
                        
                        // Store the raw file content
                        exportData[file] = content;
                    }
                }
            }

            this.logger.info('Export data:', { 
                commandCount: Object.keys(exportData).length,
                commands: Object.keys(exportData)
            });

            // Generate a descriptive filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const commandNames = Object.keys(exportData).map(f => path.basename(f, '.js')).sort().join('-');
            const shortNames = commandNames.length > 30 ? 
                `${commandNames.substring(0, 27)}...` : 
                commandNames;

            return {
                filename: `discord-commands-${shortNames}-${timestamp}.${format}`,
                data: exportData,
                rawContent: Object.values(exportData).join('\n\n')
            };
        } catch (error) {
            this._handleError('Failed to export commands', error);
            throw error;
        }
    }

    async _importJsCommand(filePath) {
        const filename = path.basename(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        const destPath = path.join(this.commandsDir, filename);
        await fs.writeFile(destPath, content);
    }

    async _importJsonCommands(filePath, selectedCommands) {
        const content = await fs.readFile(filePath, 'utf8');
        const commands = JSON.parse(content);

        for (const [name, command] of Object.entries(commands)) {
            if (!selectedCommands || selectedCommands.includes(name)) {
                await this._writeCommandFile(name, command);
            }
        }
    }

    async _writeCommandFile(name, command) {
        const commandPath = path.join(this.commandsDir, `${name}.js`);
        
        command.metadata = {
            author: 'Unknown',
            version: '1.0.0',
            category: 'General',
            description: command.description || 'No description available',
            permissions: [],
            cooldown: 3,
            examples: [],
            ...command.metadata
        };

        if (typeof command.execute === 'string') {
            command.execute = new Function('return ' + command.execute)();
        }

        const commandContent = `module.exports = ${JSON.stringify({
            ...command,
            execute: command.execute.toString()
        }, null, 2).replace(
            /"execute": "(.*)"/, 
            (_, fn) => `"execute": ${fn.replace(/\\n/g, '\n')}`
        )};`;

        await fs.writeFile(commandPath, commandContent);
    }

    async _registerCommandsWithDiscord() {
        await this.reloadCommands();
        if (this.bot.client?.token) {
            await this.bot.registerApplicationCommands(this.bot.client.token);
        }
        this.logger.info('Commands imported and registered successfully');
    }

    _handleError(message, error, additionalInfo = {}) {
        this.logger.error(message, {
            error: error.message,
            stack: error.stack,
            ...additionalInfo
        });
    }

    getCommands() {
        if (!this.bot?.commandManager) return [];
        return this.bot.commandManager.getCommandList();
    }

    getCommandHelp(commandName) {
        if (!this.bot?.commandManager) return null;
        return this.bot.commandManager.getCommandHelp(commandName);
    }
}

module.exports = CommandService;
