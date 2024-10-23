const { ActivityType } = require('discord.js');
const Store = require('electron-store');

class PresenceManager {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
        this.store = new Store();
    }

    async updatePresence(presenceData) {
        if (!this.client?.isReady()) return false;

        try {
            await this.client.user.setPresence({
                status: presenceData.status,
                activities: [{
                    name: presenceData.activity.name,
                    type: ActivityType[presenceData.activity.type]
                }]
            });

            this.logger.info('Bot presence updated', {
                status: presenceData.status,
                activity: presenceData.activity
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to update bot presence', {
                error: error.message,
                presenceData
            });
            return false;
        }
    }

    async loadSavedPresence() {
        try {
            await this.updatePresence({
                status: this.store.get('botStatus', 'online'),
                activity: {
                    type: this.store.get('activityType', 'PLAYING'),
                    name: this.store.get('activityName', '')
                }
            });
        } catch (error) {
            this.logger.error('Failed to load saved presence', {
                error: error.message
            });
        }
    }

    getStatus() {
        if (!this.client?.isReady()) return null;
        return {
            status: this.client.user.presence.status,
            activity: this.client.user.presence.activities[0] || null
        };
    }
}

module.exports = PresenceManager;
