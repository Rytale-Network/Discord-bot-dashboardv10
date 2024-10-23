const fs = require('fs').promises;
const path = require('path');
const { Collection } = require('discord.js');

class CommandManager {
    constructor(botManager) {
        this.bot = botManager;
        this.commands = new Collection();
        this.commandsPath = path.join(__dirname, '../commands');
    }

    async loadCommands() {
        try {
            // Create commands directory if it doesn't exist
            try {
                await fs.access(this.commandsPath);
            } catch {
                await fs.mkdir(this.commandsPath, { recursive: true });
                this.bot.logger.info('Created commands directory');
            }

            // Read command files
            const commandFiles = await fs.readdir(this.commandsPath);
            const jsFiles = commandFiles.filter(file => file.endsWith('.js'));

            this.bot.logger.info(`Loading ${jsFiles.length} commands...`);

            for (const file of jsFiles) {
                try {
                    const filePath = path.join(this.commandsPath, file);
                    // Clear require cache to reload commands
                    delete require.cache[require.resolve(filePath)];
                    const command = require(filePath);

                    if ('data' in command && 'execute' in command) {
                        this.commands.set(command.data.name, command);
                        this.bot.logger.debug(`Loaded command: ${command.data.name}`);
                    } else {
                        this.bot.logger.warn(`Invalid command file: ${file}`);
                    }
                } catch (error) {
                    this.bot.logger.error(`Error loading command file: ${file}`, {
                        error: error.message,
                        stack: error.stack
                    });
                }
            }

            // Set up command handling
            this.bot.client.on('interactionCreate', async interaction => {
                if (!interaction.isCommand()) return;

                try {
                    const command = this.commands.get(interaction.commandName);
                    if (!command) return;

                    this.bot.logger.debug(`Executing command: ${interaction.commandName}`, {
                        user: interaction.user.tag,
                        guild: interaction.guild?.name,
                        channel: interaction.channel?.name
                    });

                    await command.execute(interaction);
                } catch (error) {
                    this.bot.logger.error(`Error executing command: ${interaction.commandName}`, {
                        error: error.message,
                        stack: error.stack
                    });

                    const errorMessage = 'There was an error executing this command!';
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: errorMessage, ephemeral: true });
                    } else {
                        await interaction.reply({ content: errorMessage, ephemeral: true });
                    }
                }
            });

            this.bot.logger.info(`Loaded ${this.commands.size} commands successfully`);
        } catch (error) {
            this.bot.logger.error('Failed to load commands', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async reloadCommands() {
        try {
            this.commands.clear();
            await this.loadCommands();
            this.bot.logger.info('Commands reloaded successfully');
            return true;
        } catch (error) {
            this.bot.logger.error('Failed to reload commands', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    getCommands() {
        return Array.from(this.commands.values()).map(cmd => ({
            name: cmd.data.name,
            description: cmd.data.description,
            options: cmd.data.options || []
        }));
    }
}

module.exports = CommandManager;
