class BotControlService {
    constructor(bot, logger) {
        this.bot = bot;
        this.logger = logger;
    }

    async start(token) {
        try {
            this.logger.info('Starting Discord bot service...');
            const result = await this.bot.start(token);
            if (!result) throw new Error('Bot failed to start');
            return true;
        } catch (error) {
            this._handleError('Failed to start Discord bot service', error);
            throw error;
        }
    }

    async stop() {
        try {
            if (!this.bot) return true;

            this.logger.info('Stopping Discord bot service...');
            const result = await this.bot.stop();
            if (!result) throw new Error('Bot failed to stop');
            return true;
        } catch (error) {
            this._handleError('Failed to stop Discord bot service', error);
            throw error;
        }
    }

    async restart() {
        try {
            if (!this.bot) throw new Error('Bot not initialized');

            this.logger.info('Restarting Discord bot service...');
            const result = await this.bot.restart();
            if (!result) throw new Error('Bot failed to restart');
            return true;
        } catch (error) {
            this._handleError('Failed to restart Discord bot service', error);
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

    _handleError(message, error, additionalInfo = {}) {
        this.logger.error(message, {
            error: error.message,
            stack: error.stack,
            ...additionalInfo
        });
    }
}

module.exports = BotControlService;
