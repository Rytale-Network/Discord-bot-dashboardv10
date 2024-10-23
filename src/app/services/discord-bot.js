const LogManager = require('../../bot/core/LogManager');
const BotManager = require('../../bot/core/BotManager');
const EventEmitter = require('events');
const path = require('path');

class DiscordBotService extends EventEmitter {
    constructor() {
        super();
        this.logger = new LogManager();
        this.bot = null;
        this.initialized = false;

        // Forward all log events immediately
        this.logger.on('log', (log) => {
            this.emit('log', log);
        });
    }

    initialize() {
        if (this.initialized) return;
        
        try {
            this.bot = new BotManager(this.logger);
            this.setupEventForwarding();
            this.initialized = true;
        } catch (error) {
            this.logger.error('Failed to initialize Discord bot service', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    setupEventForwarding() {
        if (!this.bot) return;

        // Forward bot status updates
        this.bot.on('statusUpdate', (status) => {
            this.emit('statusUpdate', status);
        });

        // Forward server updates
        this.bot.on('serversUpdate', (servers) => {
            this.emit('serversUpdate', servers);
        });

        // Forward Discord debug events
        this.bot.client?.on('debug', (info) => {
            this.logger.debug(info);
        });

        // Forward Discord warnings
        this.bot.client?.on('warn', (info) => {
            this.logger.warn(info);
        });

        // Forward Discord errors
        this.bot.client?.on('error', (error) => {
            this.logger.error('Discord client error', {
                error: error.message,
                stack: error.stack
            });
        });
    }

    async start(token) {
        try {
            if (!this.initialized) {
                this.initialize();
            }

            this.logger.info('Starting Discord bot service...');
            const result = await this.bot.start(token);
            if (!result) {
                throw new Error('Bot failed to start');
            }
            return true;
        } catch (error) {
            this.logger.error('Failed to start Discord bot service', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async stop() {
        try {
            if (!this.bot) return true;

            this.logger.info('Stopping Discord bot service...');
            const result = await this.bot.stop();
            if (!result) {
                throw new Error('Bot failed to stop');
            }
            return true;
        } catch (error) {
            this.logger.error('Failed to stop Discord bot service', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async restart() {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized');
            }

            this.logger.info('Restarting Discord bot service...');
            const result = await this.bot.restart();
            if (!result) {
                throw new Error('Bot failed to restart');
            }
            return true;
        } catch (error) {
            this.logger.error('Failed to restart Discord bot service', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    getStatus() {
        if (!this.bot) {
            return {
                online: false,
                uptime: 0,
                commandCount: 0,
                serverCount: 0,
                userCount: 0
            };
        }
        return this.bot.getStatus();
    }

    getServers() {
        if (!this.bot) return [];
        return this.bot.getServers();
    }

    async getServerDetails(serverId) {
        if (!this.bot) return null;
        return await this.bot.getServerDetails(serverId);
    }

    async reloadCommands() {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized');
            }

            this.logger.info('Reloading bot commands...');
            const result = await this.bot.reloadCommands();
            if (!result) {
                throw new Error('Failed to reload commands');
            }
            return true;
        } catch (error) {
            this.logger.error('Failed to reload commands', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async reloadEvents() {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized');
            }

            this.logger.info('Reloading bot events...');
            const result = await this.bot.reloadEvents();
            if (!result) {
                throw new Error('Failed to reload events');
            }
            return true;
        } catch (error) {
            this.logger.error('Failed to reload events', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    getCommands() {
        if (!this.bot || !this.bot.commandManager) return [];
        return this.bot.commandManager.getCommandList();
    }

    getCommandHelp(commandName) {
        if (!this.bot || !this.bot.commandManager) return null;
        return this.bot.commandManager.getCommandHelp(commandName);
    }

    getRegisteredEvents() {
        if (!this.bot || !this.bot.eventManager) return {};
        return this.bot.eventManager.getRegisteredEvents();
    }
}

// Export singleton instance
const discordBot = new DiscordBotService();
module.exports = discordBot;
