#!/usr/bin/env node

const { program } = require('commander');
const { LogManager } = require('./core/LogManager');
const BotManager = require('./core/BotManager');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

program
    .version('1.0.0')
    .description('Discord Bot CLI Runner')
    .option('-t --token <token>', 'Bot token')
    .option('-c --config <path>', 'Path to config file')
    .option('-l --logs <path>', 'Path to log directory')
    .parse(process.argv);

const options = program.opts();

async function main() {
    // Initialize logger
    const logger = new LogManager();
    
    // Set up log directory
    const logPath = options.logs || path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath, { recursive: true });
    }
    logger.setLogPath(logPath);

    // Initialize bot manager
    const bot = new BotManager(logger);

    // Get bot token
    let token = options.token;
    if (!token) {
        if (options.config) {
            try {
                const config = require(path.resolve(options.config));
                token = config.token;
            } catch (error) {
                logger.error('Failed to load config file', { error: error.message });
            }
        }
        if (!token) {
            token = process.env.DISCORD_BOT_TOKEN;
        }
    }

    if (!token) {
        logger.error('No bot token provided. Please provide a token via --token, config file, or DISCORD_BOT_TOKEN environment variable.');
        process.exit(1);
    }

    // Handle process signals
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT signal, shutting down...');
        await bot.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM signal, shutting down...');
        await bot.stop();
        process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
        process.exit(1);
    });

    process.on('unhandledRejection', (error) => {
        logger.error('Unhandled Rejection', { error: error.message, stack: error.stack });
    });

    // Start the bot
    try {
        await bot.start(token);

        // Set up status logging
        setInterval(() => {
            const status = bot.getStatus();
            logger.info('Bot Status', {
                online: status.online,
                uptime: status.uptime,
                servers: status.serverCount,
                users: status.userCount,
                commands: status.commandCount
            });
        }, 300000); // Log status every 5 minutes

        // Log initial status
        const initialStatus = bot.getStatus();
        logger.info('Bot Started Successfully', {
            online: initialStatus.online,
            servers: initialStatus.serverCount,
            users: initialStatus.userCount,
            commands: initialStatus.commandCount
        });

    } catch (error) {
        logger.error('Failed to start bot', { error: error.message, stack: error.stack });
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
