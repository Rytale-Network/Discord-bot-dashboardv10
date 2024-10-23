module.exports = {
    name: 'help',
    description: 'List all commands or get info about a specific command',
    metadata: {
        author: 'Rytale',
        version: '1.0.0',
        category: 'Information',
        description: 'Get detailed information about available commands and their usage',
        permissions: [],
        cooldown: 3,
        examples: [
            '/help',
            '/help mod',
            '/help server',
            '/help user'
        ]
    },
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
                    description: cmd.description || 'No description provided',
                    category: cmd.metadata?.category || 'Other'
                }));

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

                // Group commands by category
                const categories = {};
                commandList.forEach(cmd => {
                    if (!categories[cmd.category]) {
                        categories[cmd.category] = [];
                    }
                    categories[cmd.category].push(cmd);
                });

                // Add fields for each category
                for (const [category, cmds] of Object.entries(categories)) {
                    embed.fields.push({
                        name: category,
                        value: cmds.map(cmd => `\`${cmd.name}\` - ${cmd.description}`).join('\n')
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
                description: command.metadata?.description || command.description || 'No description provided',
                fields: [
                    {
                        name: 'Category',
                        value: command.metadata?.category || 'Other',
                        inline: true
                    },
                    {
                        name: 'Version',
                        value: command.metadata?.version || '1.0.0',
                        inline: true
                    },
                    {
                        name: 'Author',
                        value: command.metadata?.author || 'Unknown',
                        inline: true
                    }
                ],
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
            if (command.metadata?.examples?.length > 0) {
                embed.fields.push({
                    name: 'Examples',
                    value: command.metadata.examples.join('\n')
                });
            }

            // Add permissions if they exist
            if (command.metadata?.permissions?.length > 0) {
                embed.fields.push({
                    name: 'Required Permissions',
                    value: command.metadata.permissions.join(', ')
                });
            }

            // Add cooldown if it exists
            if (command.metadata?.cooldown) {
                embed.fields.push({
                    name: 'Cooldown',
                    value: `${command.metadata.cooldown} seconds`
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
