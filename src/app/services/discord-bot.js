const LogManager = require('../../bot/core/LogManager');
const BotManager = require('../../bot/core/BotManager');
const EventEmitter = require('events');
const CommandService = require('./bot/CommandService');
const EventService = require('./bot/EventService');
const ServerService = require('./bot/ServerService');
const BotControlService = require('./bot/BotControlService');

class DiscordBotService extends EventEmitter {
    constructor() {
        super();
        this.logger = new LogManager();
        this.bot = null;
        this.initialized = false;

        // Initialize services
        this.commandService = null;
        this.eventService = null;
        this.serverService = null;
        this.botControlService = null;

        this.logger.on('log', (log) => this.emit('log', log));
    }

    initialize() {
        if (this.initialized) return;
        
        try {
            this.bot = new BotManager(this.logger);
            
            // Initialize services
            this.commandService = new CommandService(this.bot, this.logger);
            this.eventService = new EventService(this.bot, this.logger);
            this.serverService = new ServerService(this.bot, this.logger);
            this.botControlService = new BotControlService(this.bot, this.logger);

            // Setup event forwarding
            this.eventService.setupEventForwarding(this);
            
            this.initialized = true;
        } catch (error) {
            this.logger.error('Failed to initialize Discord bot service', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Bot Control Methods
    async start(token) {
        if (!this.initialized) this.initialize();
        return await this.botControlService.start(token);
    }

    async stop() {
        return await this.botControlService.stop();
    }

    async restart() {
        return await this.botControlService.restart();
    }

    getStatus() {
        return this.botControlService.getStatus();
    }

    async updatePresence(presenceData) {
        if (!this.initialized) this.initialize();
        return await this.botControlService.updatePresence(presenceData);
    }

    // Server Methods
    getServers() {
        return this.serverService.getServers();
    }

    async getServerDetails(serverId) {
        return await this.serverService.getServerDetails(serverId);
    }

    // Command Methods
    async reloadCommands() {
        if (!this.initialized) this.initialize();
        return await this.commandService.reloadCommands();
    }

    async testCommand(commandName) {
        if (!this.initialized) this.initialize();
        return await this.commandService.testCommand(commandName);
    }

    async importCommands(filePath, selectedCommands) {
        if (!this.initialized) this.initialize();
        return await this.commandService.importCommands(filePath, selectedCommands);
    }

    async exportCommands(format, selectedCommands) {
        if (!this.initialized) this.initialize();
        return await this.commandService.exportCommands(format, selectedCommands);
    }

    getCommands() {
        if (!this.initialized) this.initialize();
        return this.commandService.getCommands();
    }

    getCommandHelp(commandName) {
        if (!this.initialized) this.initialize();
        return this.commandService.getCommandHelp(commandName);
    }

    // Event Methods
    async reloadEvents() {
        if (!this.initialized) this.initialize();
        return await this.eventService.reloadEvents();
    }

    getRegisteredEvents() {
        if (!this.initialized) this.initialize();
        return this.eventService.getRegisteredEvents();
    }

    // Settings Methods
    setAutoRestart(enabled) {
        if (!this.initialized) this.initialize();
        return this.bot.setAutoRestart(enabled);
    }
}

// Export singleton instance
const discordBot = new DiscordBotService();
module.exports = discordBot;
