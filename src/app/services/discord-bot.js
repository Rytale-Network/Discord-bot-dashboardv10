const { Client, GatewayIntentBits, Collection } = require('discord.js');
const EventEmitter = require('events');

class DiscordBot extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.startTime = null;
        this.commands = new Collection();
    }

    createClient() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent
            ]
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.client) return;

        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}`);
            this.startTime = Date.now();
            this.emitStatus();
            this.emitServers();
        });

        this.client.on('guildCreate', () => {
            this.emitServers();
        });

        this.client.on('guildDelete', () => {
            this.emitServers();
        });

        this.client.on('guildMemberAdd', () => {
            this.emitServers();
        });

        this.client.on('guildMemberRemove', () => {
            this.emitServers();
        });

        this.client.on('disconnect', () => {
            console.log('Bot disconnected');
            this.emitStatus();
        });

        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
            this.emitStatus();
        });

        // Emit status updates periodically
        if (!this.statusInterval) {
            this.statusInterval = setInterval(() => this.emitStatus(), 5000);
        }
    }

    emitStatus() {
        const status = this.getStatus();
        this.emit('statusUpdate', status);
    }

    emitServers() {
        const servers = this.getServers();
        this.emit('serversUpdate', servers);
    }

    async start(token) {
        try {
            // Clean up any existing client
            await this.cleanup();

            // Create new client
            this.createClient();
            
            // Attempt to login
            await this.client.login(token);
            console.log('Bot started successfully');
            return true;
        } catch (error) {
            console.error('Failed to start bot:', error);
            await this.cleanup();
            throw error;
        }
    }

    async stop() {
        try {
            await this.cleanup();
            console.log('Bot stopped successfully');
            return true;
        } catch (error) {
            console.error('Failed to stop bot:', error);
            throw error;
        }
    }

    async cleanup() {
        try {
            if (this.statusInterval) {
                clearInterval(this.statusInterval);
                this.statusInterval = null;
            }

            if (this.client) {
                // Remove all listeners to prevent memory leaks
                this.client.removeAllListeners();
                
                // Destroy the client if it exists and is logged in
                if (this.client.isReady()) {
                    await this.client.destroy();
                }
                
                this.client = null;
            }

            this.startTime = null;
            this.emitStatus();
        } catch (error) {
            console.error('Error during cleanup:', error);
            // Continue cleanup even if there's an error
            this.client = null;
            this.startTime = null;
            this.emitStatus();
        }
    }

    async restart() {
        try {
            console.log('Starting bot restart...');
            const token = this.client?.token;
            if (!token) {
                throw new Error('No token available for restart');
            }

            console.log('Stopping bot...');
            await this.stop();

            // Wait a moment before reconnecting
            console.log('Waiting before reconnect...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log('Starting bot...');
            const result = await this.start(token);
            
            if (!result) {
                throw new Error('Failed to restart bot');
            }

            return true;
        } catch (error) {
            console.error('Failed to restart bot:', error);
            throw error;
        }
    }

    getStatus() {
        const online = this.client?.isReady() || false;
        const uptime = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
        return { online, uptime };
    }

    getServers() {
        if (!this.client?.isReady()) return [];
        
        return this.client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            iconURL: guild.iconURL(),
            memberCount: guild.memberCount
        }));
    }

    async getServerDetails(serverId) {
        if (!this.client?.isReady()) return null;

        try {
            const guild = await this.client.guilds.fetch(serverId);
            if (!guild) return null;

            const members = await guild.members.fetch();
            const channels = guild.channels.cache;

            return {
                id: guild.id,
                name: guild.name,
                iconURL: guild.iconURL(),
                memberCount: guild.memberCount,
                channels: channels.map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type
                })),
                roles: guild.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    position: role.position
                }))
            };
        } catch (error) {
            console.error('Failed to fetch server details:', error);
            throw error;
        }
    }
}

module.exports = new DiscordBot();
