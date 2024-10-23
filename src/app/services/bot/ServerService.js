class ServerService {
    constructor(bot, logger) {
        this.bot = bot;
        this.logger = logger;
    }

    getServers() {
        if (!this.bot) return [];
        return this.bot.getServers();
    }

    async getServerDetails(serverId) {
        if (!this.bot) return null;
        return await this.bot.getServerDetails(serverId);
    }

    _handleError(message, error, additionalInfo = {}) {
        this.logger.error(message, {
            error: error.message,
            stack: error.stack,
            ...additionalInfo
        });
    }
}

module.exports = ServerService;
