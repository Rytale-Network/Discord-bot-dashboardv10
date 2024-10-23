const Store = require('electron-store');

class BotControlService {
    constructor(bot, logger) {
        this.bot = bot;
        this.logger = logger;
        this.store = new Store();
    }

    async start(token) {
        try {
            const result = await this.bot.start(token);
            if (!result) throw new Error('Bot start failed');

            // Apply saved presence after successful start
            await this.applyPresence();
            return true;
        } catch (error) {
            this.logger.error('Failed to start bot', { error: error.message });
            throw error;
        }
    }

    async stop() {
        try {
            const result = await this.bot.stop();
            if (!result) throw new Error('Bot stop failed');
            return true;
        } catch (error) {
            this.logger.error('Failed to stop bot', { error: error.message });
            throw error;
        }
    }

    async restart() {
        try {
            const result = await this.bot.restart();
            if (!result) throw new Error('Bot restart failed');

            // Apply saved presence after successful restart
            await this.applyPresence();
            return true;
        } catch (error) {
            this.logger.error('Failed to restart bot', { error: error.message });
            throw error;
        }
    }

    getStatus() {
        return this.bot.getStatus();
    }

    async updatePresence(presenceData) {
        try {
            if (!this.bot.client?.isReady()) {
                throw new Error('Bot is not ready');
            }

            // Save presence data
            this.store.set('botStatus', presenceData.status);
            this.store.set('activityType', presenceData.activity.type);
            this.store.set('activityName', presenceData.activity.name);

            // Apply presence
            await this.bot.client.user.setPresence({
                status: presenceData.status,
                activities: [{
                    name: presenceData.activity.name,
                    type: presenceData.activity.type
                }]
            });

            this.logger.info('Bot presence updated', presenceData);
            return true;
        } catch (error) {
            this.logger.error('Failed to update bot presence', { error: error.message });
            throw error;
        }
    }

    async applyPresence() {
        try {
            if (!this.bot.client?.isReady()) return false;

            const status = this.store.get('botStatus', 'online');
            const activityType = this.store.get('activityType', 'PLAYING');
            const activityName = this.store.get('activityName', '');

            await this.updatePresence({
                status,
                activity: {
                    type: activityType,
                    name: activityName
                }
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to apply saved presence', { error: error.message });
            return false;
        }
    }
}

module.exports = BotControlService;
