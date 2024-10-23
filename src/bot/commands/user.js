module.exports = {
    name: 'user',
    description: 'Get user information',
    options: [
        {
            name: 'target',
            type: 6, // USER type
            description: 'User to get information about',
            required: false
        }
    ],
    async execute(interaction) {
        try {
            // Defer the reply first
            await interaction.deferReply();

            const target = interaction.options.getUser('target') || interaction.user;
            const member = interaction.guild?.members.cache.get(target.id);

            const roles = member ? member.roles.cache
                .filter(role => role.id !== interaction.guild.id) // Filter out @everyone
                .map(role => role.toString())
                .join(', ') || 'None' : 'N/A';

            const joinedAt = member ? member.joinedAt.toLocaleDateString() : 'N/A';
            const createdAt = target.createdAt.toLocaleDateString();
            const isBot = target.bot ? 'Yes' : 'No';
            const status = member ? member.presence?.status || 'offline' : 'N/A';

            const embed = {
                color: 0x7289DA,
                title: `User Information - ${target.tag}`,
                thumbnail: {
                    url: target.displayAvatarURL({ dynamic: true })
                },
                fields: [
                    {
                        name: 'Username',
                        value: target.username,
                        inline: true
                    },
                    {
                        name: 'Discriminator',
                        value: target.discriminator,
                        inline: true
                    },
                    {
                        name: 'Bot',
                        value: isBot,
                        inline: true
                    },
                    {
                        name: 'Status',
                        value: status.charAt(0).toUpperCase() + status.slice(1),
                        inline: true
                    },
                    {
                        name: 'Account Created',
                        value: createdAt,
                        inline: true
                    },
                    {
                        name: 'Joined Server',
                        value: joinedAt,
                        inline: true
                    }
                ],
                footer: {
                    text: `ID: ${target.id}`
                },
                timestamp: new Date()
            };

            // Add roles field if available and not empty
            if (roles !== 'N/A' && roles !== 'None') {
                embed.fields.push({
                    name: 'Roles',
                    value: roles,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in user command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Failed to get user information.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: 'Failed to get user information.'
                });
            }
        }
    }
};
