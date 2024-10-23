module.exports = {
    name: 'user',
    description: 'Get user information',
    metadata: {
        author: 'Rytale',
        version: '1.0.0',
        category: 'Information',
        description: 'Display detailed information about a Discord user including roles, join date, and status',
        permissions: [],
        cooldown: 5,
        examples: [
            '/user',
            '/user @username',
            '/user 123456789012345678'
        ]
    },
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
                .sort((a, b) => b.position - a.position) // Sort by position
                .map(role => role.toString())
                .join(', ') || 'None' : 'N/A';

            const joinedAt = member ? member.joinedAt.toLocaleDateString() : 'N/A';
            const createdAt = target.createdAt.toLocaleDateString();
            const isBot = target.bot ? 'Yes' : 'No';
            const status = member ? member.presence?.status || 'offline' : 'N/A';

            // Get member permissions if available
            const permissions = member ? member.permissions.toArray()
                .map(perm => perm.toLowerCase().replace(/_/g, ' '))
                .join(', ') : 'N/A';

            const embed = {
                color: member?.displayColor || 0x7289DA,
                title: `User Information - ${target.tag}`,
                thumbnail: {
                    url: target.displayAvatarURL({ dynamic: true, size: 256 })
                },
                fields: [
                    {
                        name: 'User Details',
                        value: [
                            `👤 Username: ${target.username}`,
                            `🏷️ Discriminator: ${target.discriminator}`,
                            `🤖 Bot: ${isBot}`,
                            `📅 Account Created: ${createdAt}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: 'Server Details',
                        value: [
                            `📊 Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                            `📥 Joined Server: ${joinedAt}`,
                            `💼 Nickname: ${member?.nickname || 'None'}`
                        ].join('\n'),
                        inline: false
                    }
                ],
                footer: {
                    text: `ID: ${target.id} • Requested by ${interaction.user.tag}`
                },
                timestamp: new Date()
            };

            // Add roles field if available and not empty
            if (roles !== 'N/A' && roles !== 'None') {
                embed.fields.push({
                    name: '🎭 Roles',
                    value: roles,
                    inline: false
                });
            }

            // Add key permissions if available
            if (permissions !== 'N/A') {
                const keyPermissions = [
                    'administrator',
                    'manage guild',
                    'manage roles',
                    'manage channels',
                    'manage messages',
                    'kick members',
                    'ban members',
                    'moderate members'
                ];
                const userKeyPerms = permissions.split(', ')
                    .filter(perm => keyPermissions.some(key => perm.includes(key)));

                if (userKeyPerms.length > 0) {
                    embed.fields.push({
                        name: '🔑 Key Permissions',
                        value: userKeyPerms.map(perm => 
                            `• ${perm.charAt(0).toUpperCase() + perm.slice(1)}`
                        ).join('\n'),
                        inline: false
                    });
                }
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
