class EventService {
    constructor(bot, logger) {
        this.bot = bot;
        this.logger = logger;
    }

    setupEventForwarding(emitter) {
        if (!this.bot) return;

        // Bot events
        this.bot.on('statusUpdate', status => emitter.emit('statusUpdate', status));
        this.bot.on('serversUpdate', servers => emitter.emit('serversUpdate', servers));
        this.bot.on('commandsUpdate', commands => emitter.emit('commandsUpdate', commands));

        // Discord client events
        this.bot.client?.on('debug', info => this.logger.debug(info));
        this.bot.client?.on('warn', info => this.logger.warn(info));
        this.bot.client?.on('error', error => {
            this.logger.error('Discord client error', {
                error: error.message,
                stack: error.stack
            });
        });
    }

    async reloadEvents() {
        try {
            if (!this.bot) throw new Error('Bot not initialized');

            this.logger.info('Reloading bot events...');
            const result = await this.bot.reloadEvents();
            if (!result) throw new Error('Failed to reload events');
            return true;
        } catch (error) {
            this._handleError('Failed to reload events', error);
            throw error;
        }
    }

    getRegisteredEvents() {
        if (!this.bot?.eventManager) return {};
        return this.bot.eventManager.getRegisteredEvents();
    }

    _handleError(message, error, additionalInfo = {}) {
        this.logger.error(message, {
            error: error.message,
            stack: error.stack,
            ...additionalInfo
        });
    }
}

module.exports = EventService;
