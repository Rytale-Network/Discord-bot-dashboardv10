const { ipcMain } = require('electron');
const Store = require('electron-store');

class SettingsHandler {
    constructor(discordBot, store) {
        this.discordBot = discordBot;
        this.store = store || new Store();
        this.setupHandlers();
    }

    setupHandlers() {
        // Get setting value
        ipcMain.handle('get-setting', (_, key) => {
            return this.store.get(key);
        });

        // Set setting value
        ipcMain.handle('set-setting', (_, key, value) => {
            this.store.set(key, value);
            this.handleSettingChange(key, value);
            return true;
        });

        // Update bot presence
        ipcMain.handle('update-bot-presence', async (_, presenceData) => {
            try {
                // Save presence data first
                this.store.set('botStatus', presenceData.status);
                this.store.set('activityType', presenceData.activity.type);
                this.store.set('activityName', presenceData.activity.name);

                // Then update presence if bot is ready
                if (this.discordBot.client?.isReady()) {
                    await this.discordBot.updatePresence(presenceData);
                }
                return true;
            } catch (error) {
                console.error('Failed to update bot presence:', error);
                throw error;
            }
        });

        // Get all settings
        ipcMain.handle('get-all-settings', () => {
            return this.getAllSettings();
        });

        // Save multiple settings
        ipcMain.handle('save-settings', async (_, settings) => {
            try {
                // Save all settings first
                Object.entries(settings).forEach(([key, value]) => {
                    this.store.set(key, value);
                });

                // Apply non-presence settings first
                this.handleSettingChange('debugMode', settings.debugMode);
                this.handleSettingChange('logLevel', settings.logLevel);
                this.handleSettingChange('logToFile', settings.logToFile);
                this.handleSettingChange('logRetention', settings.logRetention);
                this.handleSettingChange('autoRestart', settings.autoRestart);
                this.handleSettingChange('autoStart', settings.autoStart);

                // Apply presence update immediately if bot is ready
                if (this.discordBot.client?.isReady()) {
                    await this.discordBot.updatePresence({
                        status: settings.botStatus,
                        activity: {
                            type: settings.activityType,
                            name: settings.activityName
                        }
                    });
                }

                return true;
            } catch (error) {
                console.error('Failed to save settings:', error);
                throw error;
            }
        });
    }

    handleSettingChange(key, value) {
        try {
            switch (key) {
                case 'debugMode':
                    if (value) {
                        this.discordBot.logger.setLevel('debug');
                    } else {
                        this.discordBot.logger.setLevel(this.store.get('logLevel', 'info'));
                    }
                    break;

                case 'logLevel':
                    if (!this.store.get('debugMode', false)) {
                        this.discordBot.logger.setLevel(value);
                    }
                    break;

                case 'logToFile':
                    this.discordBot.logger.setFileLogging(value);
                    break;

                case 'logRetention':
                    this.discordBot.logger.setRetentionDays(parseInt(value));
                    break;

                case 'autoStart':
                    // This will be handled on next app start
                    break;

                case 'autoRestart':
                    if (typeof this.discordBot.setAutoRestart === 'function') {
                        this.discordBot.setAutoRestart(value);
                    }
                    break;

                case 'botStatus':
                case 'activityType':
                case 'activityName':
                    // Update presence immediately if all required values are present
                    const status = this.store.get('botStatus', 'online');
                    const activityType = this.store.get('activityType', 'PLAYING');
                    const activityName = this.store.get('activityName', '');
                    
                    if (this.discordBot.client?.isReady()) {
                        this.discordBot.updatePresence({
                            status,
                            activity: {
                                type: activityType,
                                name: activityName
                            }
                        }).catch(error => {
                            console.error('Failed to update presence:', error);
                        });
                    }
                    break;

                default:
                    // Log unknown settings for debugging
                    console.warn(`Unknown setting: ${key}`);
                    break;
            }
        } catch (error) {
            console.error(`Error applying setting ${key}:`, error);
            throw error;
        }
    }

    // Get all settings
    getAllSettings() {
        return {
            // Bot Configuration
            botToken: this.store.get('botToken'),
            botStatus: this.store.get('botStatus', 'online'),
            activityType: this.store.get('activityType', 'PLAYING'),
            activityName: this.store.get('activityName', ''),

            // Behavior Settings
            autoStart: this.store.get('autoStart', false),
            autoRestart: this.store.get('autoRestart', false),
            debugMode: this.store.get('debugMode', false),

            // Log Settings
            logLevel: this.store.get('logLevel', 'info'),
            logToFile: this.store.get('logToFile', false),
            logRetention: this.store.get('logRetention', 7)
        };
    }
}

module.exports = SettingsHandler;
