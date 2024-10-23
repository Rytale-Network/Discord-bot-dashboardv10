const fs = require('fs');
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');

class CommandManager {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
        this.commands = new Collection();
        this.rest = null;
    }

    setToken(token) {
        this.rest = new REST({ version: '10' }).setToken(token);
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        this.logger.info('Loading commands...', { 
            commandCount: commandFiles.length,
            commandFiles: commandFiles 
        });

        const commandsToRegister = [];

        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if (!this.validateCommand(command)) {
                    this.logger.warn(`Invalid command file: ${file}`, {
                        reason: 'Missing required properties or invalid structure'
                    });
                    continue;
                }

                const formattedCommand = this.formatCommand(command);
                this.commands.set(command.name, formattedCommand);
                commandsToRegister.push(this.formatCommandForRegistration(formattedCommand));

                this.logger.info(`Loaded command: ${command.name}`, {
                    file: file,
                    description: command.description,
                    author: command.metadata?.author || 'Unknown',
                    version: command.metadata?.version || '1.0.0'
                });
            } catch (error) {
                this.logger.error(`Failed to load command file: ${file}`, {
                    error: error.message,
                    stack: error.stack
                });
            }
        }

        if (this.client?.token) {
            await this.registerCommandsForAllGuilds(commandsToRegister);
        } else {
            this.logger.warn('No token available, commands loaded but not registered with Discord');
        }

        this.logger.info('Commands loaded successfully', {
            totalCommands: this.commands.size,
            commands: Array.from(this.commands.keys())
        });
    }

    async registerCommandsForAllGuilds(commands) {
        try {
            if (!this.client?.token) {
                throw new Error('No token available to register commands');
            }

            this.setToken(this.client.token);

            const guilds = Array.from(this.client.guilds.cache.values());
            this.logger.info('Registering commands for guilds...', {
                guildCount: guilds.length,
                commandCount: commands.length
            });

            for (const guild of guilds) {
                try {
                    const data = await this.rest.put(
                        Routes.applicationGuildCommands(this.client.application.id, guild.id),
                        { body: commands }
                    );

                    this.logger.info(`Registered commands for guild: ${guild.name}`, {
                        guildId: guild.id,
                        registeredCount: data.length,
                        commands: data.map(cmd => cmd.name)
                    });
                } catch (error) {
                    this.logger.error(`Failed to register commands for guild: ${guild.name}`, {
                        guildId: guild.id,
                        error: error.message
                    });
                }
            }

            this.logger.info('Completed command registration for all guilds');
        } catch (error) {
            this.logger.error('Failed to register commands', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async registerCommandsForGuild(guildId, commands) {
        try {
            if (!this.client?.token) {
                throw new Error('No token available to register commands');
            }

            this.setToken(this.client.token);

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                throw new Error(`Guild not found: ${guildId}`);
            }

            this.logger.info(`Registering commands for guild: ${guild.name}`, {
                guildId: guild.id,
                commandCount: commands.length
            });

            const data = await this.rest.put(
                Routes.applicationGuildCommands(this.client.application.id, guild.id),
                { body: commands }
            );

            this.logger.info(`Successfully registered commands for guild: ${guild.name}`, {
                guildId: guild.id,
                registeredCount: data.length,
                commands: data.map(cmd => cmd.name)
            });

            return true;
        } catch (error) {
            this.logger.error(`Failed to register commands for guild: ${guildId}`, {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    validateCommand(command) {
        if (!command.name || !command.description || !command.execute) {
            return false;
        }

        if (!/^[\w-]{1,32}$/.test(command.name)) {
            this.logger.warn(`Invalid command name format: ${command.name}`);
            return false;
        }

        if (command.description.length > 100) {
            this.logger.warn(`Description too long for command: ${command.name}`);
            return false;
        }

        if (command.metadata && typeof command.metadata !== 'object') {
            return false;
        }

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
        const formatted = { ...command };

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

        return formatted;
    }

    formatCommandForRegistration(command) {
        return {
            name: command.name,
            description: command.description,
            options: command.options || [],
            default_member_permissions: command.permissions || undefined,
            dm_permission: false
        };
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

            delete require.cache[require.resolve(filePath)];
            this.commands.delete(commandName);

            const command = require(filePath);
            if (this.validateCommand(command)) {
                const formattedCommand = this.formatCommand(command);
                this.commands.set(command.name, formattedCommand);
                
                if (this.client?.token) {
                    const commandData = [this.formatCommandForRegistration(formattedCommand)];
                    await this.registerCommandsForAllGuilds(commandData);
                }
                
                this.logger.info(`Reloaded command: ${command.name}`, {
                    author: command.metadata?.author || 'Unknown',
                    version: command.metadata?.version || '1.0.0'
                });
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
            this.commands.clear();
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
            options: cmd.options || [],
            metadata: cmd.metadata || {
                author: 'Unknown',
                version: '1.0.0'
            }
        }));
    }

    getCommandHelp(name) {
        const command = this.commands.get(name);
        if (!command) return null;

        return {
            name: command.name,
            description: command.description,
            options: command.options || [],
            usage: command.usage || 'No usage information provided',
            metadata: command.metadata || {
                author: 'Unknown',
                version: '1.0.0'
            }
        };
    }
}

module.exports = CommandManager;
