require('dotenv').config();
const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');
const LogManager = require('../bot/core/LogManager');
const commander = require('commander');

const logger = new LogManager();
const program = new commander.Command();

program
    .option('-g, --guild <id>', 'Clear commands for a specific guild ID')
    .option('-a, --all', 'Clear commands from all guilds')
    .parse(process.argv);

const options = program.opts();

async function clearGlobalCommands(rest) {
    try {
        logger.info('Clearing global commands...');
        const result = await rest.put(
            Routes.applicationCommands(process.env.APPLICATION_ID),
            { body: [] }
        );
        logger.info('Successfully cleared global commands', {
            clearedCount: result.length
        });
        return true;
    } catch (error) {
        logger.error('Failed to clear global commands', {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

async function clearGuildCommands(rest, guildId) {
    try {
        logger.info(`Clearing commands for guild: ${guildId}`);
        const result = await rest.put(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID, guildId),
            { body: [] }
        );
        logger.info(`Successfully cleared commands for guild: ${guildId}`, {
            clearedCount: result.length
        });
        return true;
    } catch (error) {
        logger.error(`Failed to clear commands for guild: ${guildId}`, {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

async function clearAllGuildCommands(rest) {
    try {
        logger.info('Fetching guilds...');
        const guilds = await rest.get(Routes.userGuilds());
        logger.info(`Found ${guilds.length} guilds`);

        for (const guild of guilds) {
            await clearGuildCommands(rest, guild.id);
            // Add a small delay between guild operations
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return true;
    } catch (error) {
        logger.error('Failed to clear guild commands', {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

async function forceClientUpdate() {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });

    try {
        logger.info('Starting client update process...');
        await client.login(process.env.DISCORD_BOT_TOKEN);

        await new Promise(resolve => {
            client.once('ready', async () => {
                logger.info('Client ready, updating application commands...');

                try {
                    // Force fetch and clear application commands
                    const commands = await client.application.commands.fetch();
                    logger.info(`Found ${commands.size} application commands`);

                    for (const command of commands.values()) {
                        await command.delete();
                        logger.info(`Deleted command: ${command.name}`);
                    }

                    // Handle guild commands
                    if (options.all || options.guild) {
                        const guilds = options.guild ? 
                            [await client.guilds.fetch(options.guild)] : 
                            await client.guilds.fetch();

                        for (const guild of guilds.values()) {
                            logger.info(`Processing guild: ${guild.name}`);
                            const guildCommands = await guild.commands.fetch();
                            
                            for (const command of guildCommands.values()) {
                                await command.delete();
                                logger.info(`Deleted guild command: ${command.name} from ${guild.name}`);
                            }

                            // Add delay between guild operations
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }

                    logger.info('Successfully updated client commands');
                } catch (error) {
                    logger.error('Error during client update', {
                        error: error.message,
                        stack: error.stack
                    });
                }

                resolve();
            });
        });

        // Wait for Discord to process the changes
        logger.info('Waiting for Discord to process changes...');
        await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
        logger.error('Failed to update client', {
            error: error.message,
            stack: error.stack
        });
    } finally {
        if (client.isReady()) {
            await client.destroy();
        }
    }
}

async function clearCommands() {
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.APPLICATION_ID) {
        logger.error('Missing required environment variables', {
            required: ['DISCORD_BOT_TOKEN', 'APPLICATION_ID']
        });
        process.exit(1);
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        logger.info('Starting command cleanup...');

        // First, use REST API to clear commands
        if (options.guild) {
            await clearGuildCommands(rest, options.guild);
        } else if (options.all) {
            await clearGlobalCommands(rest);
            await clearAllGuildCommands(rest);
        } else {
            await clearGlobalCommands(rest);
        }

        // Then force client update to clear cache
        await forceClientUpdate();

        logger.info('Command cleanup complete! Please wait a few minutes for Discord to fully process the changes.');
        process.exit(0);
    } catch (error) {
        logger.error('Failed to clear commands', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

clearCommands();
