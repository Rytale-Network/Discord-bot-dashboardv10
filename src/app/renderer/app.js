import StatusManager from './modules/status.js';
import ServerManager from './modules/servers.js';
import SettingsManager from './modules/settings.js';
import navigationManager from './modules/navigation.js';
import ConsoleManager from './modules/console.js';
import CommandManager from './modules/commands.js';

class App {
    constructor() {
        // Initialize console first to capture all logs
        this.console = new ConsoleManager();
        
        // Initialize navigation before other managers
        this.navigation = navigationManager;
        
        // Initialize other managers
        this.status = new StatusManager();
        this.servers = new ServerManager();
        this.settings = new SettingsManager();
        this.commands = new CommandManager();
        
        this.setupErrorHandling();
        this.initialize();
    }

    setupErrorHandling() {
        window.electronAPI.onError(({ type, message }) => {
            console.error(`${type}:`, message);
            
            // Make token-related errors more user-friendly
            if (message.includes('token')) {
                if (message.includes('invalid')) {
                    alert('The Discord bot token is invalid. Please check your settings and enter a valid token.');
                } else if (message.includes('No bot token')) {
                    alert('Please configure your Discord bot token in the settings before starting the bot.');
                } else {
                    alert('There was an issue with the bot token. Please check your settings.');
                }
            } else {
                alert(`Error: ${message}`);
            }
        });

        // Forward console logs to our custom console
        const originalConsole = {
            log: console.log.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            debug: console.debug.bind(console)
        };

        // Override console methods
        console.log = (...args) => {
            originalConsole.log(...args);
            this.console?.addLog({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: args.map(arg => this.formatLogArgument(arg)).join(' ')
            });
        };

        console.info = (...args) => {
            originalConsole.info(...args);
            this.console?.addLog({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: args.map(arg => this.formatLogArgument(arg)).join(' ')
            });
        };

        console.warn = (...args) => {
            originalConsole.warn(...args);
            this.console?.addLog({
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: args.map(arg => this.formatLogArgument(arg)).join(' ')
            });
        };

        console.error = (...args) => {
            originalConsole.error(...args);
            this.console?.addLog({
                timestamp: new Date().toISOString(),
                level: 'error',
                message: args.map(arg => this.formatLogArgument(arg)).join(' ')
            });
        };

        console.debug = (...args) => {
            originalConsole.debug(...args);
            this.console?.addLog({
                timestamp: new Date().toISOString(),
                level: 'debug',
                message: args.map(arg => this.formatLogArgument(arg)).join(' ')
            });
        };
    }

    formatLogArgument(arg) {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) {
            return `${arg.message}\n${arg.stack}`;
        }
        try {
            return JSON.stringify(arg, null, 2);
        } catch (e) {
            return String(arg);
        }
    }

    async initialize() {
        try {
            console.info('Initializing application...');
            
            // Load initial data
            await this.settings.loadSettings();
            await this.status.updateStatus();
            await this.servers.updateServers();
            await this.commands.loadCommands();
            
            // Set up periodic updates
            setInterval(() => this.status.updateStatus(), 30000); // Update status every 30 seconds
            setInterval(() => this.servers.updateServers(), 60000); // Update server list every minute
            
            // Set up quick action buttons
            this.setupQuickActions();
            
            // Trigger initial navigation to ensure proper page setup
            const currentPage = document.querySelector('.page.active');
            if (currentPage) {
                this.navigation.handleNavigation({
                    preventDefault: () => {},
                    target: document.querySelector(`nav a[href="#${currentPage.id}"]`)
                });
            }
            
            console.info('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }

    setupQuickActions() {
        // Restart bot button
        const restartBtn = document.getElementById('restart-bot');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.status.restartBot());
        }

        // Reload commands button
        const reloadCommandsBtn = document.getElementById('reload-commands');
        if (reloadCommandsBtn) {
            reloadCommandsBtn.addEventListener('click', () => this.commands.loadCommands());
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
