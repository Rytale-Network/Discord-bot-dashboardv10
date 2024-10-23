const { Client, GatewayIntentBits, Collection, REST, Routes, Partials } = require('discord.js');
const EventEmitter = require('events');
const CommandManager = require('./CommandManager');
const EventManager = require('./EventManager');

class BotManager extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        this.client = null;
        this.startTime = null;
        this.commandManager = null;
        this.eventManager = null;
        this.rest = null;
        
        // Verify required environment variables
        if (!process.env.APPLICATION_ID) {
            this.logger.error('APPLICATION_ID is not set in environment variables');
            throw new Error('APPLICATION_ID is required');
        }
    }

    createClient() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildBans,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildModeration
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction,
                Partials.User,
                Partials.GuildMember
            ]
        });

        // Initialize managers
        this.commandManager = new CommandManager(this.client, this.logger);
        this.eventManager = new EventManager(this.client, this.logger, this.commandManager);

        // Make commands accessible to the client
        this.client.commands = this.commandManager.commands;
    }

    async registerApplicationCommands(token) {
        try {
            this.logger.info('Registering application commands...');
            
            // Initialize REST API
            this.rest = new REST({ version: '10' }).setToken(token);

            // Get all commands
            const commands = Array.from(this.commandManager.commands.values()).map(cmd => ({
                name: cmd.name,
                description: cmd.description,
                options: cmd.options || [],
                default_member_permissions: cmd.permissions || undefined,
                dm_permission: false
            }));

            this.logger.info(`Preparing to register ${commands.length} commands...`, {
                commands: commands.map(c => c.name)
            });

            // Register commands globally using APPLICATION_ID
            const result = await this.rest.put(
                Routes.applicationCommands(process.env.APPLICATION_ID),
                { body: commands }
            );

            this.logger.info(`Successfully registered ${result.length} application commands`, {
                registeredCommands: result.map(cmd => cmd.name)
            });

            // Store the registered commands
            this.registeredCommands = result;

            return true;
        } catch (error) {
            this.logger.error('Failed to register application commands', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async start(token) {
        try {
            this.logger.info('Starting bot...');
            await this.cleanup();
            this.createClient();
            
            // Load commands and events
            await this.commandManager.loadCommands();
            await this.eventManager.loadEvents();
            this.eventManager.registerEvents();

            // Login to Discord
            await this.client.login(token);
            this.startTime = Date.now();

            // Register commands after login
            await this.registerApplicationCommands(token);
            
            this.logger.info('Bot started successfully', {
                username: this.client.user.tag,
                id: this.client.user.id
            });

            // Set up periodic status updates
            setInterval(() => {
                this.emitStatus();
            }, 30000);

            return true;
        } catch (error) {
            this.logger.error('Failed to start bot', { 
                error: error.message,
                stack: error.stack
            });
            await this.cleanup();
            throw error;
        }
    }

    async stop() {
        try {
            this.logger.info('Stopping bot...');
            await this.cleanup();
            this.logger.info('Bot stopped successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to stop bot', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async cleanup() {
        try {
            if (this.client) {
                this.client.removeAllListeners();
                if (this.client.isReady()) {
                    await this.client.destroy();
                }
                this.client = null;
                this.commandManager = null;
                this.eventManager = null;
                this.rest = null;
            }
            this.startTime = null;
            this.emitStatus();
        } catch (error) {
            this.logger.error('Error during cleanup', {
                error: error.message,
                stack: error.stack
            });
            this.client = null;
            this.commandManager = null;
            this.eventManager = null;
            this.rest = null;
            this.startTime = null;
            this.emitStatus();
        }
    }

    async restart() {
        try {
            this.logger.info('Restarting bot...');
            const token = this.client?.token;
            if (!token) {
                throw new Error('No token available for restart');
            }

            await this.stop();
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await this.start(token);
        } catch (error) {
            this.logger.error('Failed to restart bot', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    getStatus() {
        return {
            online: this.client?.isReady() || false,
            uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
            commandCount: this.commandManager?.commands.size || 0,
            serverCount: this.client?.guilds.cache.size || 0,
            userCount: this.client?.users.cache.size || 0
        };
    }

    emitStatus() {
        const status = this.getStatus();
        this.emit('statusUpdate', status);
    }

    getServers() {
        if (!this.client?.isReady()) return [];
        
        return this.client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            iconURL: guild.iconURL(),
            memberCount: guild.memberCount
        }));
    }

    async getServerDetails(serverId) {
        if (!this.client?.isReady()) return null;

        try {
            const guild = await this.client.guilds.fetch(serverId);
            if (!guild) return null;

            const members = await guild.members.fetch();
            const channels = guild.channels.cache;

            return {
                id: guild.id,
                name: guild.name,
                iconURL: guild.iconURL(),
                memberCount: guild.memberCount,
                channels: channels.map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type
                })),
                roles: guild.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    position: role.position
                }))
            };
        } catch (error) {
            this.logger.error('Failed to fetch server details', {
                error: error.message,
                serverId
            });
            throw error;
        }
    }

    getCommands() {
        if (!this.commandManager) return [];
        return this.commandManager.getCommandList();
    }

    async reloadCommands() {
        if (!this.commandManager) return false;
        const result = await this.commandManager.reloadAllCommands();
        if (result && this.client?.token) {
            await this.registerApplicationCommands(this.client.token);
        }
        return result;
    }

    async reloadEvents() {
        if (!this.eventManager) return false;
        return await this.eventManager.reloadEvents();
    }
}

module.exports = BotManager;
