module.exports = {
    name: 'ping',
    description: 'Check bot latency',
    async execute(interaction) {
        try {
            // Defer the reply first
            await interaction.deferReply();

            // Calculate latency
            const sent = await interaction.editReply('Pinging...');
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);

            // Edit with the final message
            await interaction.editReply(
                `Pong! 🏓\nBot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms`
            );
        } catch (error) {
            console.error('Error in ping command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Failed to get ping information.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: 'Failed to get ping information.'
                });
            }
        }
    }
};
