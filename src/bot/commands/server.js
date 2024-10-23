module.exports = {
    name: 'server',
    description: 'Get server information',
    metadata: {
        author: 'Rytale',
        version: '1.0.0',
        category: 'Information',
        description: 'Display detailed information about the current Discord server',
        permissions: [],
        cooldown: 5,
        examples: [
            '/server'
        ]
    },
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

            // Get channel type counts
            const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
            const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;

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
                        name: 'Created At',
                        value: createdAt,
                        inline: true
                    },
                    {
                        name: 'Server ID',
                        value: guild.id,
                        inline: true
                    },
                    {
                        name: 'Members',
                        value: memberCount.toString(),
                        inline: true
                    },
                    {
                        name: 'Roles',
                        value: roleCount.toString(),
                        inline: true
                    },
                    {
                        name: 'Boost Status',
                        value: `Level ${boostLevel} (${boostCount} boosts)`,
                        inline: true
                    },
                    {
                        name: 'Channels',
                        value: [
                            `📝 Text: ${textChannels}`,
                            `🔊 Voice: ${voiceChannels}`,
                            `📁 Categories: ${categoryChannels}`,
                            `📊 Total: ${channelCount}`
                        ].join('\n'),
                        inline: false
                    }
                ],
                footer: {
                    text: `Requested by ${interaction.user.tag}`
                },
                timestamp: new Date()
            };

            // Add verification level
            const verificationLevels = {
                0: 'None',
                1: 'Low',
                2: 'Medium',
                3: 'High',
                4: 'Highest'
            };
            embed.fields.push({
                name: 'Verification Level',
                value: verificationLevels[guild.verificationLevel] || 'Unknown',
                inline: true
            });

            // Add features if any
            if (guild.features.length > 0) {
                embed.fields.push({
                    name: 'Features',
                    value: guild.features.map(f => `• ${f.toLowerCase().replace(/_/g, ' ')}`).join('\n'),
                    inline: false
                });
            }

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
