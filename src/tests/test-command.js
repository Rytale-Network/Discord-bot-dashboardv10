module.exports = {
    name: 'test',
    description: 'A test command with various features',
    metadata: {
        author: 'Test Author',
        version: '1.0.0',
        category: 'Testing',
        description: 'A comprehensive test command showcasing various Discord bot features',
        permissions: ['SEND_MESSAGES'],
        cooldown: 3,
        examples: [
            '/test echo Hello World',
            '/test random 1 100',
            '/test info @user',
            '/test embed'
        ]
    },
    options: [
        {
            name: 'echo',
            type: 1, // Subcommand
            description: 'Echo back a message',
            options: [
                {
                    name: 'message',
                    type: 3, // STRING type
                    description: 'Message to echo back',
                    required: true
                }
            ]
        },
        {
            name: 'random',
            type: 1, // Subcommand
            description: 'Generate a random number',
            options: [
                {
                    name: 'min',
                    type: 4, // INTEGER type
                    description: 'Minimum value',
                    required: true
                },
                {
                    name: 'max',
                    type: 4, // INTEGER type
                    description: 'Maximum value',
                    required: true
                }
            ]
        },
        {
            name: 'info',
            type: 1, // Subcommand
            description: 'Get information about a user',
            options: [
                {
                    name: 'user',
                    type: 6, // USER type
                    description: 'User to get info about',
                    required: true
                }
            ]
        },
        {
            name: 'embed',
            type: 1, // Subcommand
            description: 'Send a test embed message'
        }
    ],
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'echo': {
                    const message = interaction.options.getString('message');
                    await interaction.reply({
                        content: `Echo: ${message}`,
                        ephemeral: true
                    });
                    break;
                }

                case 'random': {
                    const min = interaction.options.getInteger('min');
                    const max = interaction.options.getInteger('max');
                    const random = Math.floor(Math.random() * (max - min + 1)) + min;
                    await interaction.reply({
                        content: `Random number between ${min} and ${max}: ${random}`,
                        ephemeral: true
                    });
                    break;
                }

                case 'info': {
                    const user = interaction.options.getUser('user');
                    const member = await interaction.guild.members.fetch(user.id);
                    
                    await interaction.reply({
                        embeds: [{
                            title: 'User Information',
                            thumbnail: { url: user.displayAvatarURL() },
                            fields: [
                                { name: 'Username', value: user.tag, inline: true },
                                { name: 'ID', value: user.id, inline: true },
                                { name: 'Joined Server', value: member.joinedAt.toLocaleDateString(), inline: true },
                                { name: 'Account Created', value: user.createdAt.toLocaleDateString(), inline: true },
                                { name: 'Roles', value: member.roles.cache.map(r => r.name).join(', ') || 'None' }
                            ],
                            color: 0x7289DA,
                            timestamp: new Date()
                        }],
                        ephemeral: true
                    });
                    break;
                }

                case 'embed': {
                    await interaction.reply({
                        embeds: [{
                            title: 'Test Embed',
                            description: 'This is a test embed message showcasing various features',
                            fields: [
                                { name: 'Field 1', value: 'This is a regular field', inline: false },
                                { name: 'Field 2', value: 'This is an inline field', inline: true },
                                { name: 'Field 3', value: 'This is another inline field', inline: true }
                            ],
                            color: 0x00FF00,
                            footer: { text: 'Test Footer' },
                            timestamp: new Date()
                        }],
                        ephemeral: true
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('Error in test command:', error);
            await interaction.reply({
                content: 'An error occurred while executing the test command.',
                ephemeral: true
            });
        }
    }
};
