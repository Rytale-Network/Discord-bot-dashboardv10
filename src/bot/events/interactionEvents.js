module.exports = {
    name: 'interactionEvents',
    events: {
        interactionCreate: async (interaction, logger, commands) => {
            try {
                // Handle slash commands
                if (interaction.isChatInputCommand()) {
                    logger.debug('Command interaction received', {
                        commandName: interaction.commandName,
                        user: interaction.user.tag,
                        guild: interaction.guild?.name || 'DM'
                    });

                    const command = commands.get(interaction.commandName);
                    
                    if (!command) {
                        logger.warn('Unknown Command Attempted', {
                            command: interaction.commandName,
                            user: interaction.user.tag,
                            guild: interaction.guild?.name || 'DM',
                            availableCommands: Array.from(commands.keys())
                        });
                        
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: 'Unknown command! Use `/help` to see available commands.',
                                ephemeral: true
                            });
                        }
                        return;
                    }

                    try {
                        logger.info('Executing command', {
                            command: interaction.commandName,
                            user: interaction.user.tag,
                            guild: interaction.guild?.name || 'DM',
                            options: interaction.options?.data || []
                        });

                        await command.execute(interaction);
                    } catch (error) {
                        logger.error('Command Execution Failed', {
                            command: interaction.commandName,
                            user: interaction.user.tag,
                            guild: interaction.guild?.name || 'DM',
                            error: error.message,
                            stack: error.stack
                        });

                        try {
                            const errorMessage = {
                                content: 'There was an error executing this command!',
                                ephemeral: true
                            };

                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply(errorMessage);
                            } else {
                                await interaction.editReply(errorMessage);
                            }
                        } catch (replyError) {
                            logger.error('Failed to send error message', {
                                error: replyError.message,
                                stack: replyError.stack
                            });
                        }
                    }
                }

                // Handle button interactions
                if (interaction.isButton()) {
                    logger.info('Button Interaction', {
                        customId: interaction.customId,
                        user: interaction.user.tag,
                        guild: interaction.guild?.name || 'DM'
                    });

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferReply({ ephemeral: true });
                    }

                    // Handle different button interactions based on customId
                    switch (interaction.customId) {
                        case 'confirm_action':
                            await interaction.editReply({
                                content: 'Action confirmed!',
                                ephemeral: true
                            });
                            break;

                        case 'cancel_action':
                            await interaction.editReply({
                                content: 'Action cancelled.',
                                ephemeral: true
                            });
                            break;

                        default:
                            await interaction.editReply({
                                content: 'This button is not currently handled.',
                                ephemeral: true
                            });
                    }
                }

                // Handle select menu interactions
                if (interaction.isStringSelectMenu()) {
                    logger.info('Select Menu Interaction', {
                        customId: interaction.customId,
                        values: interaction.values,
                        user: interaction.user.tag,
                        guild: interaction.guild?.name || 'DM'
                    });

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferReply({ ephemeral: true });
                    }

                    await interaction.editReply({
                        content: `You selected: ${interaction.values.join(', ')}`,
                        ephemeral: true
                    });
                }

                // Handle modal submissions
                if (interaction.isModalSubmit()) {
                    logger.info('Modal Submission', {
                        customId: interaction.customId,
                        user: interaction.user.tag,
                        guild: interaction.guild?.name || 'DM'
                    });

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferReply({ ephemeral: true });
                    }

                    // Get the data entered by the user
                    const fields = {};
                    for (const [key, value] of interaction.fields.fields) {
                        fields[key] = value;
                    }

                    logger.debug('Modal Fields', { fields });

                    await interaction.editReply({
                        content: 'Your submission was received successfully!',
                        ephemeral: true
                    });
                }
            } catch (error) {
                logger.error('Error handling interaction', {
                    error: error.message,
                    stack: error.stack,
                    type: interaction.type,
                    commandName: interaction.commandName
                });

                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'An error occurred while processing your request.',
                            ephemeral: true
                        });
                    }
                } catch (replyError) {
                    logger.error('Failed to send error message', {
                        error: replyError.message,
                        stack: replyError.stack
                    });
                }
            }
        }
    }
};
