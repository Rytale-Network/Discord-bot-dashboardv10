module.exports = {
    name: 'server',
    description: 'Get server information',
    async execute(interaction) {
        try {
            // Defer the reply first
            await interaction.deferReply();

            const guild = interaction.guild;
            if (!guild) {
                await interaction.editReply('This command can only be used in a server!');
                return;
            }

            const owner = await guild.fetchOwner();
            const memberCount = guild.memberCount;
            const channelCount = guild.channels.cache.size;
            const roleCount = guild.roles.cache.size;
            const createdAt = guild.createdAt.toLocaleDateString();
            const boostLevel = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount;

            const embed = {
                color: 0x7289DA,
                title: guild.name,
                thumbnail: {
                    url: guild.iconURL() || 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png'
                },
                fields: [
                    {
                        name: 'Owner',
                        value: owner.user.tag,
                        inline: true
                    },
                    {
                        name: 'Members',
                        value: memberCount.toString(),
                        inline: true
                    },
                    {
                        name: 'Channels',
                        value: channelCount.toString(),
                        inline: true
                    },
                    {
                        name: 'Roles',
                        value: roleCount.toString(),
                        inline: true
                    },
                    {
                        name: 'Created At',
                        value: createdAt,
                        inline: true
                    },
                    {
                        name: 'Boost Level',
                        value: `Level ${boostLevel} (${boostCount} boosts)`,
                        inline: true
                    }
                ],
                footer: {
                    text: `Server ID: ${guild.id}`
                },
                timestamp: new Date()
            };

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in server command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Failed to get server information.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: 'Failed to get server information.'
                });
            }
        }
    }
};
