module.exports = {
    name: 'mod',
    description: 'Moderation commands',
    metadata: {
        author: 'Rytale',
        version: '1.0.0',
        category: 'Moderation',
        description: 'Advanced moderation tools for server management',
        permissions: ['MODERATE_MEMBERS', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_MESSAGES'],
        cooldown: 5, // seconds
        examples: [
            '/mod kick @user spamming',
            '/mod ban @user 7 repeated violations',
            '/mod timeout @user 60 inappropriate behavior',
            '/mod clear 50'
        ]
    },
    options: [
        {
            name: 'kick',
            type: 1, // Subcommand
            description: 'Kick a user',
            options: [
                {
                    name: 'user',
                    type: 6, // USER type
                    description: 'User to kick',
                    required: true
                },
                {
                    name: 'reason',
                    type: 3, // STRING type
                    description: 'Reason for kick',
                    required: false
                }
            ]
        },
        {
            name: 'ban',
            type: 1, // Subcommand
            description: 'Ban a user',
            options: [
                {
                    name: 'user',
                    type: 6, // USER type
                    description: 'User to ban',
                    required: true
                },
                {
                    name: 'reason',
                    type: 3, // STRING type
                    description: 'Reason for ban',
                    required: false
                },
                {
                    name: 'days',
                    type: 4, // INTEGER type
                    description: 'Number of days of messages to delete',
                    required: false,
                    choices: [
                        { name: '1 day', value: 1 },
                        { name: '7 days', value: 7 }
                    ]
                }
            ]
        },
        {
            name: 'timeout',
            type: 1, // Subcommand
            description: 'Timeout a user',
            options: [
                {
                    name: 'user',
                    type: 6, // USER type
                    description: 'User to timeout',
                    required: true
                },
                {
                    name: 'duration',
                    type: 4, // INTEGER type
                    description: 'Timeout duration in minutes',
                    required: true
                },
                {
                    name: 'reason',
                    type: 3, // STRING type
                    description: 'Reason for timeout',
                    required: false
                }
            ]
        },
        {
            name: 'clear',
            type: 1, // Subcommand
            description: 'Clear messages',
            options: [
                {
                    name: 'amount',
                    type: 4, // INTEGER type
                    description: 'Number of messages to clear (max 100)',
                    required: true,
                    min_value: 1,
                    max_value: 100
                }
            ]
        }
    ],
    async execute(interaction) {
        try {
            // Defer the reply first
            await interaction.deferReply({ ephemeral: true });

            // Check if user has required permissions
            if (!interaction.member.permissions.has('MODERATE_MEMBERS')) {
                await interaction.editReply('You do not have permission to use moderation commands!');
                return;
            }

            const subcommand = interaction.options.getSubcommand();
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            switch (subcommand) {
                case 'kick':
                    try {
                        const member = await interaction.guild.members.fetch(user.id);
                        if (!member.kickable) {
                            await interaction.editReply('I cannot kick this user! They may have higher permissions than me.');
                            return;
                        }

                        await member.kick(reason);
                        await interaction.editReply(`Successfully kicked ${user.tag}\nReason: ${reason}`);
                    } catch (error) {
                        await interaction.editReply(`Failed to kick user: ${error.message}`);
                    }
                    break;

                case 'ban':
                    try {
                        const days = interaction.options.getInteger('days') || 0;
                        const member = await interaction.guild.members.fetch(user.id);
                        
                        if (!member.bannable) {
                            await interaction.editReply('I cannot ban this user! They may have higher permissions than me.');
                            return;
                        }

                        await member.ban({ deleteMessageDays: days, reason });
                        await interaction.editReply(`Successfully banned ${user.tag}\nReason: ${reason}`);
                    } catch (error) {
                        await interaction.editReply(`Failed to ban user: ${error.message}`);
                    }
                    break;

                case 'timeout':
                    try {
                        const duration = interaction.options.getInteger('duration');
                        const member = await interaction.guild.members.fetch(user.id);
                        
                        if (!member.moderatable) {
                            await interaction.editReply('I cannot timeout this user! They may have higher permissions than me.');
                            return;
                        }

                        await member.timeout(duration * 60 * 1000, reason);
                        await interaction.editReply(
                            `Successfully timed out ${user.tag} for ${duration} minutes\nReason: ${reason}`
                        );
                    } catch (error) {
                        await interaction.editReply(`Failed to timeout user: ${error.message}`);
                    }
                    break;

                case 'clear':
                    try {
                        const amount = interaction.options.getInteger('amount');
                        const messages = await interaction.channel.bulkDelete(amount, true);
                        
                        await interaction.editReply(`Successfully deleted ${messages.size} messages.`);
                    } catch (error) {
                        await interaction.editReply(`Failed to clear messages: ${error.message}`);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error in mod command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Failed to execute moderation command.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: 'Failed to execute moderation command.'
                });
            }
        }
    }
};
