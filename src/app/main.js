const { app } = require('electron');
const Store = require('electron-store');
const path = require('path');
const discordBot = require('./services/discord-bot');
require('dotenv').config();

const WindowHandler = require('./handlers/WindowHandler');
const CommandHandler = require('./handlers/CommandHandler');
const BotHandler = require('./handlers/BotHandler');
const ServerHandler = require('./handlers/ServerHandler');
const SettingsHandler = require('./handlers/SettingsHandler');
const LogHandler = require('./handlers/LogHandler');

class Application {
    constructor() {
        this.store = new Store();
        this.logPath = path.join(app.getPath('userData'), 'logs');
        this.windowHandler = new WindowHandler(discordBot);
        this.botHandler = null;
        
        // Initialize bot service
        discordBot.initialize();
        discordBot.logger.setLogPath(this.logPath);
    }

    async initializeBot() {
        try {
            const token = this.store.get('botToken') || process.env.DISCORD_BOT_TOKEN;
            if (token) {
                discordBot.logger.info('Bot token configured, ready to start');
                if (this.store.get('autoStart', false)) {
                    await discordBot.start(token);
                }
            }
        } catch (error) {
            discordBot.logger.error('Failed to initialize bot', { error: error.message });
        }
    }

    setupHandlers() {
        const mainWindow = this.windowHandler.getWindow();
        
        new CommandHandler(discordBot, mainWindow);
        // Create BotHandler and store reference
        this.botHandler = new BotHandler(discordBot, this.store);
        // Set the main window for event forwarding
        this.botHandler.setMainWindow(mainWindow);
        new ServerHandler(discordBot);
        new SettingsHandler(discordBot, this.store);
        new LogHandler(discordBot, this.logPath);
    }

    setupErrorHandling() {
        const mainWindow = this.windowHandler.getWindow();

        process.on('uncaughtException', (error) => {
            discordBot.logger.error('Uncaught Exception', { error: error.message });
            mainWindow?.webContents.send('error', {
                type: 'uncaughtException',
                message: error.message
            });
        });

        process.on('unhandledRejection', (error) => {
            discordBot.logger.error('Unhandled Rejection', { error: error.message });
            mainWindow?.webContents.send('error', {
                type: 'unhandledRejection',
                message: error.message
            });
        });
    }

    async start() {
        await app.whenReady();

        this.windowHandler.createWindow();
        this.windowHandler.setupEventForwarding();
        this.setupHandlers();
        this.setupErrorHandling();
        await this.initializeBot();

        // Ensure window recreation also sets up event forwarding
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.windowHandler.createWindow();
                const mainWindow = this.windowHandler.getWindow();
                if (this.botHandler) {
                    this.botHandler.setMainWindow(mainWindow);
                }
            }
        });

        app.on('window-all-closed', async () => {
            try {
                await discordBot.stop();
            } catch (error) {
                discordBot.logger.error('Error stopping bot during shutdown');
            }
            
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
    }
}

const application = new Application();
application.start();
