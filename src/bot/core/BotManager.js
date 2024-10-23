const { Client, GatewayIntentBits, Collection } = require('discord.js');
const EventEmitter = require('events');

class BotManager extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
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
            this.startTime = Date.now();
            this.logger.info(`Bot logged in as ${this.client.user.tag}`);
            this.emitStatus();
            this.emitServers();
        });

        this.client.on('disconnect', () => {
            this.logger.warn('Bot disconnected');
            this.emitStatus();
        });

        this.client.on('error', (error) => {
            this.logger.error('Discord client error', { error: error.message });
            this.emitStatus();
        });

        this.client.on('guildCreate', (guild) => {
            this.logger.info(`Bot joined server: ${guild.name}`);
            this.emitServers();
        });

        this.client.on('guildDelete', (guild) => {
            this.logger.info(`Bot left server: ${guild.name}`);
            this.emitServers();
        });

        this.client.on('guildMemberAdd', (member) => {
            this.logger.debug(`Member joined: ${member.user.tag} in ${member.guild.name}`);
            this.emitServers();
        });

        this.client.on('guildMemberRemove', (member) => {
            this.logger.debug(`Member left: ${member.user.tag} from ${member.guild.name}`);
            this.emitServers();
        });
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
            await this.cleanup();
            this.createClient();
            
            await this.client.login(token);
            this.logger.info('Bot started successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to start bot', { error: error.message });
            await this.cleanup();
            throw error;
        }
    }

    async stop() {
        try {
            await this.cleanup();
            this.logger.info('Bot stopped successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to stop bot', { error: error.message });
            throw error;
        }
    }

    async cleanup() {
        try {
            if (this.client) {
                this.client.removeAllListeners();
                if (this.client.isReady()) {
                    await this.client.destroy();
                }
                this.client = null;
            }
            this.startTime = null;
            this.emitStatus();
        } catch (error) {
            this.logger.error('Error during cleanup', { error: error.message });
            this.client = null;
            this.startTime = null;
            this.emitStatus();
        }
    }

    async restart() {
        try {
            const token = this.client?.token;
            if (!token) {
                throw new Error('No token available for restart');
            }

            await this.stop();
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await this.start(token);
        } catch (error) {
            this.logger.error('Failed to restart bot', { error: error.message });
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
            this.logger.error(`Failed to fetch server details for ${serverId}`, { error: error.message });
            throw error;
        }
    }
}

module.exports = BotManager;
