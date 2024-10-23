#!/usr/bin/env node
const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
require('dotenv').config();

// Import the bot core
const BotManager = require('./core/BotManager');
const LogManager = require('./core/LogManager');

const store = new Store();
const logger = new LogManager();
const botManager = new BotManager(logger);

// Set up CLI
program
    .version('1.0.0')
    .description('Discord Bot CLI Runner')
    .option('-t, --token <token>', 'Bot token')
    .option('-c, --config <path>', 'Path to config file')
    .option('-l, --logs <path>', 'Path to log directory')
    .parse(process.argv);

const options = program.opts();

async function getToken() {
    // Priority: CLI arg > env var > stored token
    if (options.token) {
        return options.token;
    }

    const storedToken = store.get('botToken');
    if (storedToken) {
        return storedToken;
    }

    const envToken = process.env.DISCORD_BOT_TOKEN;
    if (envToken) {
        return envToken;
    }

    throw new Error('No bot token provided. Use --token, DISCORD_BOT_TOKEN env var, or configure through the UI');
}

async function main() {
    try {
        // Set up logging
        const logPath = options.logs || path.join(__dirname, '../../logs');
        if (!fs.existsSync(logPath)) {
            fs.mkdirSync(logPath, { recursive: true });
        }
        logger.setLogPath(logPath);

        // Start the bot
        const token = await getToken();
        await botManager.start(token);

        // Handle shutdown
        process.on('SIGINT', async () => {
            console.log('\nGracefully shutting down...');
            await botManager.stop();
            process.exit(0);
        });

        // Export IPC interface for UI
        if (require.main !== module) {
            return {
                botManager,
                logger
            };
        }
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Only run if called directly (not imported)
if (require.main === module) {
    main();
}

module.exports = main;
