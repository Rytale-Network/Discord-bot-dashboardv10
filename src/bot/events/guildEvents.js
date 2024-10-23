module.exports = {
    name: 'guildEvents',
    events: {
        guildMemberAdd: async (member, logger) => {
            logger.info('Member Joined', {
                guild: member.guild.name,
                user: member.user.tag,
                id: member.id,
                timestamp: new Date().toISOString()
            });

            // Get the default channel or system channel
            const channel = member.guild.systemChannel || 
                member.guild.channels.cache.find(ch => 
                    ch.type === 'GUILD_TEXT' && 
                    ch.permissionsFor(member.guild.me).has('SEND_MESSAGES')
                );

            if (channel) {
                const embed = {
                    color: 0x43B581,
                    title: 'Welcome!',
                    description: `Welcome to the server, ${member}! 👋`,
                    thumbnail: {
                        url: member.user.displayAvatarURL({ dynamic: true })
                    },
                    fields: [
                        {
                            name: 'Member Count',
                            value: `We now have ${member.guild.memberCount} members!`,
                            inline: true
                        }
                    ],
                    timestamp: new Date()
                };

                await channel.send({ embeds: [embed] }).catch(err => 
                    logger.error('Failed to send welcome message', { error: err.message })
                );
            }
        },

        guildMemberRemove: async (member, logger) => {
            logger.info('Member Left', {
                guild: member.guild.name,
                user: member.user.tag,
                id: member.id,
                timestamp: new Date().toISOString()
            });

            const channel = member.guild.systemChannel;
            if (channel) {
                await channel.send(`${member.user.tag} has left the server 👋`).catch(err =>
                    logger.error('Failed to send leave message', { error: err.message })
                );
            }
        },

        guildBanAdd: async (ban, logger) => {
            logger.warn('Member Banned', {
                guild: ban.guild.name,
                user: ban.user.tag,
                reason: ban.reason || 'No reason provided',
                timestamp: new Date().toISOString()
            });
        },

        guildBanRemove: async (ban, logger) => {
            logger.info('Member Unbanned', {
                guild: ban.guild.name,
                user: ban.user.tag,
                timestamp: new Date().toISOString()
            });
        },

        channelCreate: async (channel, logger) => {
            logger.info('Channel Created', {
                guild: channel.guild.name,
                channel: channel.name,
                type: channel.type,
                timestamp: new Date().toISOString()
            });
        },

        channelDelete: async (channel, logger) => {
            logger.info('Channel Deleted', {
                guild: channel.guild.name,
                channel: channel.name,
                type: channel.type,
                timestamp: new Date().toISOString()
            });
        },

        roleCreate: async (role, logger) => {
            logger.info('Role Created', {
                guild: role.guild.name,
                role: role.name,
                color: role.hexColor,
                timestamp: new Date().toISOString()
            });
        },

        roleDelete: async (role, logger) => {
            logger.info('Role Deleted', {
                guild: role.guild.name,
                role: role.name,
                timestamp: new Date().toISOString()
            });
        },

        messageDelete: async (message, logger) => {
            // Don't log bot messages or messages without content
            if (message.author?.bot || !message.content) return;

            logger.info('Message Deleted', {
                guild: message.guild.name,
                channel: message.channel.name,
                author: message.author.tag,
                content: message.content,
                timestamp: new Date().toISOString()
            });
        },

        messageUpdate: async (oldMessage, newMessage, logger) => {
            // Don't log bot messages or messages without content changes
            if (oldMessage.author?.bot || oldMessage.content === newMessage.content) return;

            logger.info('Message Edited', {
                guild: newMessage.guild.name,
                channel: newMessage.channel.name,
                author: newMessage.author.tag,
                oldContent: oldMessage.content,
                newContent: newMessage.content,
                timestamp: new Date().toISOString()
            });
        }
    }
};
