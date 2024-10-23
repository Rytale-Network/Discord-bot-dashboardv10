const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

class CommandManager {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
        this.commands = new Collection();
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        this.logger.info('Loading commands...', { 
            commandCount: commandFiles.length,
            commandFiles: commandFiles 
        });

        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                // Clear command from cache if reloading
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                // Validate command structure
                if (!this.validateCommand(command)) {
                    this.logger.warn(`Invalid command file: ${file}`, {
                        reason: 'Missing required properties or invalid structure'
                    });
                    continue;
                }

                // Format command for Discord's API
                const formattedCommand = this.formatCommand(command);
                this.commands.set(command.name, formattedCommand);

                this.logger.info(`Loaded command: ${command.name}`, {
                    file: file,
                    description: command.description
                });
            } catch (error) {
                this.logger.error(`Failed to load command file: ${file}`, {
                    error: error.message,
                    stack: error.stack
                });
            }
        }

        this.logger.info('Commands loaded successfully', {
            totalCommands: this.commands.size,
            commands: Array.from(this.commands.keys())
        });
    }

    validateCommand(command) {
        // Basic validation
        if (!command.name || !command.description || !command.execute) {
            return false;
        }

        // Validate name format
        if (!/^[\w-]{1,32}$/.test(command.name)) {
            this.logger.warn(`Invalid command name format: ${command.name}`);
            return false;
        }

        // Validate description length
        if (command.description.length > 100) {
            this.logger.warn(`Description too long for command: ${command.name}`);
            return false;
        }

        // Validate options if present
        if (command.options) {
            if (!Array.isArray(command.options)) {
                return false;
            }
            
            for (const option of command.options) {
                if (!option.name || !option.description || !option.type) {
                    return false;
                }
            }
        }

        return true;
    }

    formatCommand(command) {
        // Create a deep copy of the command
        const formatted = { ...command };

        // Format options if present
        if (formatted.options) {
            formatted.options = formatted.options.map(option => ({
                name: option.name.toLowerCase(),
                description: option.description,
                type: option.type,
                required: option.required || false,
                choices: option.choices || undefined,
                options: option.options ? this.formatOptions(option.options) : undefined
            }));
        }

        // Add default permission if not present
        if (!formatted.default_member_permissions) {
            formatted.default_member_permissions = null;
        }

        // Add dm_permission if not present
        if (formatted.dm_permission === undefined) {
            formatted.dm_permission = false;
        }

        return formatted;
    }

    formatOptions(options) {
        return options.map(option => ({
            name: option.name.toLowerCase(),
            description: option.description,
            type: option.type,
            required: option.required || false,
            choices: option.choices || undefined
        }));
    }

    getCommand(name) {
        return this.commands.get(name);
    }

    getAllCommands() {
        return this.commands;
    }

    async reloadCommand(commandName) {
        try {
            const commandsPath = path.join(__dirname, '..', 'commands');
            const filePath = path.join(commandsPath, `${commandName}.js`);

            // Delete command from cache and collection
            delete require.cache[require.resolve(filePath)];
            this.commands.delete(commandName);

            // Load and validate the command
            const command = require(filePath);
            if (this.validateCommand(command)) {
                const formattedCommand = this.formatCommand(command);
                this.commands.set(command.name, formattedCommand);
                this.logger.info(`Reloaded command: ${command.name}`);
                return true;
            } else {
                this.logger.warn(`Failed to reload command: ${commandName}`, {
                    reason: 'Invalid command structure'
                });
                return false;
            }
        } catch (error) {
            this.logger.error(`Failed to reload command: ${commandName}`, {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    async reloadAllCommands() {
        try {
            // Clear command collection
            this.commands.clear();

            // Reload all commands
            await this.loadCommands();

            this.logger.info('Successfully reloaded all commands', {
                commandCount: this.commands.size,
                commands: Array.from(this.commands.keys())
            });
            return true;
        } catch (error) {
            this.logger.error('Failed to reload all commands', {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    getCommandList() {
        return Array.from(this.commands.values()).map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            options: cmd.options || []
        }));
    }

    getCommandHelp(name) {
        const command = this.commands.get(name);
        if (!command) return null;

        return {
            name: command.name,
            description: command.description,
            options: command.options || [],
            usage: command.usage || 'No usage information provided'
        };
    }
}

module.exports = CommandManager;
