// Status management module
class StatusManager {
    constructor() {
        // Initialize elements as null
        this.statusIndicator = null;
        this.uptimeElement = null;
        this.startStopBtn = null;
        this.buttonGrid = null;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
        
        this.setupEventListeners();
    }

    initializeElements() {
        this.statusIndicator = document.getElementById('status-indicator');
        this.uptimeElement = document.getElementById('uptime');
        this.buttonGrid = document.querySelector('.button-grid');
        
        // Only create start/stop button if it doesn't exist
        if (!document.getElementById('start-stop-bot') && this.buttonGrid) {
            this.startStopBtn = document.createElement('button');
            this.startStopBtn.id = 'start-stop-bot';
            this.startStopBtn.textContent = 'Start Bot';
            this.buttonGrid.appendChild(this.startStopBtn);
        } else {
            this.startStopBtn = document.getElementById('start-stop-bot');
        }
    }

    setupEventListeners() {
        window.electronAPI.onBotStatusUpdate(status => {
            try {
                this.updateDisplay(status);
            } catch (error) {
                console.error('Error updating status display:', error);
            }
        });
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    updateDisplay(status) {
        // Ensure elements exist before updating
        if (!this.statusIndicator || !this.uptimeElement || !this.startStopBtn) {
            this.initializeElements();
            if (!this.statusIndicator || !this.uptimeElement || !this.startStopBtn) {
                console.error('Required DOM elements not found');
                return;
            }
        }

        try {
            // Update status indicator
            this.statusIndicator.classList.toggle('online', status.online);
            this.statusIndicator.classList.toggle('offline', !status.online);
            
            // Update uptime display
            if (status.online) {
                this.uptimeElement.textContent = `Online - ${this.formatUptime(status.uptime)}`;
                this.startStopBtn.textContent = 'Stop Bot';
                this.startStopBtn.onclick = () => this.stopBot();
            } else {
                this.uptimeElement.textContent = 'Offline';
                this.startStopBtn.textContent = 'Start Bot';
                this.startStopBtn.onclick = () => this.startBot();
            }
        } catch (error) {
            console.error('Error updating status display:', error);
        }
    }

    async updateStatus() {
        try {
            const status = await window.electronAPI.getBotStatus();
            this.updateDisplay(status);
        } catch (error) {
            console.error('Failed to update bot status:', error);
        }
    }

    async startBot() {
        if (!this.startStopBtn) return;

        try {
            this.startStopBtn.disabled = true;
            this.startStopBtn.textContent = 'Starting...';
            await window.electronAPI.startBot();
            await this.updateStatus();
        } catch (error) {
            console.error('Failed to start bot:', error);
            alert('Failed to start bot. Please check your token in settings.');
        } finally {
            if (this.startStopBtn) {
                this.startStopBtn.disabled = false;
            }
        }
    }

    async stopBot() {
        if (!this.startStopBtn) return;

        try {
            this.startStopBtn.disabled = true;
            this.startStopBtn.textContent = 'Stopping...';
            await window.electronAPI.stopBot();
            await this.updateStatus();
        } catch (error) {
            console.error('Failed to stop bot:', error);
            alert('Failed to stop bot. Please try again.');
        } finally {
            if (this.startStopBtn) {
                this.startStopBtn.disabled = false;
            }
        }
    }

    async restartBot() {
        const button = document.getElementById('restart-bot');
        if (!button) return;

        try {
            button.disabled = true;
            button.textContent = 'Restarting...';

            await window.electronAPI.restartBot();
            // Wait a moment for the bot to fully restart before updating status
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.updateStatus();
            alert('Bot restarted successfully!');
        } catch (error) {
            console.error('Failed to restart bot:', error);
            alert('Failed to restart bot. Please try again.');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Restart Bot';
            }
        }
    }
}

export default StatusManager;
