module.exports = {
    name: 'help',
    description: 'List all commands or get info about a specific command',
    options: [
        {
            name: 'command',
            type: 3, // STRING type
            description: 'Get detailed info about a specific command',
            required: false
        }
    ],
    async execute(interaction) {
        try {
            const commandName = interaction.options.getString('command');
            const commands = interaction.client.commands;

            // Defer the reply first
            await interaction.deferReply({ ephemeral: true });

            if (!commandName) {
                // List all commands
                const commandList = Array.from(commands.values()).map(cmd => ({
                    name: cmd.name,
                    description: cmd.description || 'No description provided'
                }));

                // Group commands by category
                const categories = {
                    'Moderation': ['mod', 'ban', 'kick', 'timeout'],
                    'Information': ['help', 'server', 'user', 'ping'],
                    'Utility': ['clear']
                };

                const embed = {
                    color: 0x7289DA,
                    title: '📚 Available Commands',
                    description: 'Use `/help <command>` for detailed information about a specific command.',
                    fields: [],
                    footer: {
                        text: `${commandList.length} commands available`
                    },
                    timestamp: new Date()
                };

                // Add fields for each category
                for (const [category, categoryCommands] of Object.entries(categories)) {
                    const commandsInCategory = commandList
                        .filter(cmd => categoryCommands.includes(cmd.name))
                        .map(cmd => `\`${cmd.name}\` - ${cmd.description}`)
                        .join('\n');

                    if (commandsInCategory) {
                        embed.fields.push({
                            name: `${category}`,
                            value: commandsInCategory
                        });
                    }
                }

                // Add uncategorized commands
                const categorizedCommands = Object.values(categories).flat();
                const uncategorized = commandList
                    .filter(cmd => !categorizedCommands.includes(cmd.name))
                    .map(cmd => `\`${cmd.name}\` - ${cmd.description}`)
                    .join('\n');

                if (uncategorized) {
                    embed.fields.push({
                        name: 'Other',
                        value: uncategorized
                    });
                }

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Get info about specific command
            const command = commands.get(commandName);
            if (!command) {
                await interaction.editReply({
                    content: `Command \`${commandName}\` not found! Use \`/help\` to see all available commands.`,
                    ephemeral: true
                });
                return;
            }

            const embed = {
                color: 0x7289DA,
                title: `Command: ${command.name}`,
                description: command.description || 'No description provided',
                fields: [],
                timestamp: new Date()
            };

            // Add options if they exist
            if (command.options?.length > 0) {
                const optionsField = command.options
                    .filter(opt => opt.type !== 1) // Filter out subcommands
                    .map(option => {
                        const required = option.required ? '(Required)' : '(Optional)';
                        return `\`${option.name}\` - ${option.description} ${required}`;
                    })
                    .join('\n');

                if (optionsField) {
                    embed.fields.push({
                        name: 'Options',
                        value: optionsField
                    });
                }
            }

            // Add subcommands if they exist
            const subcommands = command.options?.filter(opt => opt.type === 1);
            if (subcommands?.length > 0) {
                const subcommandsField = subcommands
                    .map(sub => `\`${sub.name}\` - ${sub.description}`)
                    .join('\n');

                embed.fields.push({
                    name: 'Subcommands',
                    value: subcommandsField
                });
            }

            // Add examples if they exist
            if (command.examples) {
                embed.fields.push({
                    name: 'Examples',
                    value: command.examples.join('\n')
                });
            }

            // Add permissions if they exist
            if (command.permissions) {
                embed.fields.push({
                    name: 'Required Permissions',
                    value: command.permissions.join(', ')
                });
            }

            // Add cooldown if it exists
            if (command.cooldown) {
                embed.fields.push({
                    name: 'Cooldown',
                    value: `${command.cooldown} seconds`
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in help command:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Failed to get help information.',
                        ephemeral: true
                    });
                } else {
                    await interaction.editReply({
                        content: 'Failed to get help information.'
                    });
                }
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
    }
};
