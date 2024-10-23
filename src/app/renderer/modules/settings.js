// Settings management module
class SettingsManager {
    constructor() {
        this.form = {
            // Bot Configuration
            botToken: document.getElementById('bot-token'),
            botStatus: document.getElementById('bot-status'),
            activityType: document.getElementById('activity-type'),
            activityName: document.getElementById('activity-name'),

            // Behavior Settings
            autoStart: document.getElementById('auto-start'),
            autoRestart: document.getElementById('auto-restart'),
            debugMode: document.getElementById('debug-mode'),

            // Log Settings
            logLevel: document.getElementById('log-level'),
            logToFile: document.getElementById('log-to-file'),
            logRetention: document.getElementById('log-retention'),

            // Save Button
            saveButton: document.getElementById('save-settings')
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.saveButton.addEventListener('click', () => this.saveSettings());

        // Update activity name placeholder based on type
        this.form.activityType.addEventListener('change', () => {
            const type = this.form.activityType.value;
            let placeholder = '';
            switch (type) {
                case 'PLAYING':
                    placeholder = 'e.g., Minecraft';
                    break;
                case 'WATCHING':
                    placeholder = 'e.g., YouTube videos';
                    break;
                case 'LISTENING':
                    placeholder = 'e.g., Spotify';
                    break;
                case 'STREAMING':
                    placeholder = 'e.g., on Twitch';
                    break;
                case 'COMPETING':
                    placeholder = 'e.g., a tournament';
                    break;
            }
            this.form.activityName.placeholder = placeholder;
        });

        // Enable/disable log retention based on log to file
        this.form.logToFile.addEventListener('change', () => {
            this.form.logRetention.disabled = !this.form.logToFile.checked;
        });
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.getAllSettings();

            // Apply values to form
            this.form.botToken.value = settings.botToken || '';
            this.form.botStatus.value = settings.botStatus || 'online';
            this.form.activityType.value = settings.activityType || 'PLAYING';
            this.form.activityName.value = settings.activityName || '';
            this.form.autoStart.checked = settings.autoStart || false;
            this.form.autoRestart.checked = settings.autoRestart || false;
            this.form.debugMode.checked = settings.debugMode || false;
            this.form.logLevel.value = settings.logLevel || 'info';
            this.form.logToFile.checked = settings.logToFile || false;
            this.form.logRetention.value = settings.logRetention || 7;
            this.form.logRetention.disabled = !settings.logToFile;

            // Show a notice if no token is configured
            if (!settings.botToken) {
                this.showNotice('warning', 'Please configure your Discord bot token to get started.');
            }

            // Trigger activity type change to set placeholder
            this.form.activityType.dispatchEvent(new Event('change'));
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showNotice('error', 'Failed to load settings');
        }
    }

    showNotice(type, message) {
        const existingNotice = document.querySelector('.settings-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        const notice = document.createElement('div');
        notice.className = `settings-notice ${type}`;
        notice.textContent = message;
        this.form.botToken.parentElement.insertBefore(notice, this.form.botToken);
    }

    async saveSettings() {
        try {
            const token = this.form.botToken.value.trim();
            if (!token) {
                this.showNotice('error', 'Bot token is required');
                return;
            }

            this.form.saveButton.disabled = true;
            this.form.saveButton.textContent = 'Saving...';

            const settings = {
                // Bot Configuration
                botToken: token,
                botStatus: this.form.botStatus.value,
                activityType: this.form.activityType.value,
                activityName: this.form.activityName.value,

                // Behavior Settings
                autoStart: this.form.autoStart.checked,
                autoRestart: this.form.autoRestart.checked,
                debugMode: this.form.debugMode.checked,

                // Log Settings
                logLevel: this.form.logLevel.value,
                logToFile: this.form.logToFile.checked,
                logRetention: parseInt(this.form.logRetention.value)
            };

            await window.electronAPI.saveSettings(settings);
            this.showNotice('success', 'Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotice('error', 'Failed to save settings. Please verify your bot token is valid.');
        } finally {
            this.form.saveButton.disabled = false;
            this.form.saveButton.textContent = 'Save Settings';
        }
    }
}

export default SettingsManager;
