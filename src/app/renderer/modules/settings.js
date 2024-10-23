// Settings management module
class SettingsManager {
    constructor() {
        this.form = {
            botToken: document.getElementById('bot-token'),
            commandPrefix: document.getElementById('command-prefix'),
            autoRestart: document.getElementById('auto-restart'),
            saveButton: document.getElementById('save-settings')
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.saveButton.addEventListener('click', () => this.saveSettings());
    }

    async loadSettings() {
        try {
            const token = await window.electronAPI.getSetting('botToken');
            const prefix = await window.electronAPI.getSetting('commandPrefix');
            const autoRestart = await window.electronAPI.getSetting('autoRestart');

            this.form.botToken.value = token || '';
            this.form.commandPrefix.value = prefix || '!';
            this.form.autoRestart.checked = autoRestart || false;

            // Show a notice if no token is configured
            if (!token) {
                this.showTokenNotice();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            alert('Failed to load settings');
        }
    }

    showTokenNotice() {
        const existingNotice = document.querySelector('.settings-notice');
        if (!existingNotice) {
            const notice = document.createElement('div');
            notice.className = 'settings-notice warning';
            notice.textContent = 'Please configure your Discord bot token to get started.';
            this.form.botToken.parentElement.insertBefore(notice, this.form.botToken);
        }
    }

    async saveSettings() {
        try {
            const token = this.form.botToken.value.trim();
            if (!token) {
                alert('Bot token is required');
                return;
            }

            this.form.saveButton.disabled = true;
            this.form.saveButton.textContent = 'Saving...';

            await window.electronAPI.setSetting('botToken', token);
            await window.electronAPI.setSetting('commandPrefix', this.form.commandPrefix.value);
            await window.electronAPI.setSetting('autoRestart', this.form.autoRestart.checked);
            
            alert('Settings saved successfully!');

            // Remove token notice if it exists
            const notice = document.querySelector('.settings-notice');
            if (notice) {
                notice.remove();
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings. Please verify your bot token is valid.');
        } finally {
            this.form.saveButton.disabled = false;
            this.form.saveButton.textContent = 'Save Settings';
        }
    }
}

export default SettingsManager;
