require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Check for required environment variables
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('Error: DISCORD_BOT_TOKEN is not set in environment variables');
    process.exit(1);
}

if (!process.env.APPLICATION_ID) {
    console.error('Error: Please set your APPLICATION_ID in the .env file');
    console.error('You can find your Application ID in the Discord Developer Portal:');
    console.error('https://discord.com/developers/applications');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('Loading commands...');

// Load all command files
for (const file of commandFiles) {
    try {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('name' in command && 'description' in command) {
            commands.push({
                name: command.name,
                description: command.description,
                options: command.options || [],
                default_member_permissions: command.permissions || undefined,
                dm_permission: false
            });
            console.log(`Loaded command: ${command.name}`);
        } else {
            console.warn(`[WARNING] Command at ${file} is missing required properties`);
        }
    } catch (error) {
        console.error(`[ERROR] Failed to load command from ${file}:`, error);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log(`Starting deployment of ${commands.length} commands...`);
        console.log('Commands to deploy:', commands.map(c => c.name));

        // Deploy commands
        const data = await rest.put(
            Routes.applicationCommands(process.env.APPLICATION_ID),
            { body: commands }
        );

        console.log(`Successfully deployed ${data.length} application commands:`);
        data.forEach(cmd => {
            console.log(`- ${cmd.name} (ID: ${cmd.id})`);
        });

        // Print helpful information
        console.log('\nCommands deployed successfully!');
        console.log('\nIf the commands are not showing up, make sure:');
        console.log('1. The bot is invited to your server with the "applications.commands" scope');
        console.log('2. The bot has the necessary permissions');
        console.log('\nInvite URL format:');
        console.log(`https://discord.com/api/oauth2/authorize?client_id=${process.env.APPLICATION_ID}&permissions=8&scope=bot%20applications.commands`);
    } catch (error) {
        console.error('Failed to deploy commands:');
        console.error(error);

        if (error.code === 50001) {
            console.error('\nERROR: Bot lacks permissions. Make sure it has the "applications.commands" scope.');
            console.error('Re-invite the bot using this URL:');
            console.error(`https://discord.com/api/oauth2/authorize?client_id=${process.env.APPLICATION_ID}&permissions=8&scope=bot%20applications.commands`);
        }
    }
})();
