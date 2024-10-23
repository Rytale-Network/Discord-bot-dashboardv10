const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  Partials,
} = require("discord.js");
const EventEmitter = require("events");
const CommandManager = require("./CommandManager");
const EventManager = require("./EventManager");
const PresenceManager = require("./PresenceManager");

class BotManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.client = null;
    this.startTime = null;
    this.commandManager = null;
    this.eventManager = null;
    this.presenceManager = null;
    this.rest = null;
    this.serverDetailsCache = new Map();
    this.totalUsers = 0;
    this.autoRestart = false;

    if (!process.env.APPLICATION_ID) {
      this.logger.error("APPLICATION_ID is not set in environment variables");
      throw new Error("APPLICATION_ID is required");
    }
  }

  setAutoRestart(enabled) {
    this.autoRestart = enabled;
  }

  createClient() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildModeration,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
      ],
    });

    this.commandManager = new CommandManager(this.client, this.logger);
    this.eventManager = new EventManager(
      this.client,
      this.logger,
      this.commandManager
    );
    this.presenceManager = new PresenceManager(this.client, this.logger);
    this.client.commands = this.commandManager.commands;

    // Set up guild cache invalidation
    this.client.on("guildUpdate", (oldGuild, newGuild) => {
      this.serverDetailsCache.delete(newGuild.id);
      this.updateTotalUsers();
      this.emitStatus();
    });

    this.client.on("guildMemberAdd", (member) => {
      const cachedGuild = this.serverDetailsCache.get(member.guild.id);
      if (cachedGuild) {
        cachedGuild.memberCount = member.guild.memberCount;
      }
      this.totalUsers++;
      this.emitStatus();
    });

    this.client.on("guildMemberRemove", (member) => {
      const cachedGuild = this.serverDetailsCache.get(member.guild.id);
      if (cachedGuild) {
        cachedGuild.memberCount = member.guild.memberCount;
      }
      this.totalUsers--;
      this.emitStatus();
    });

    // Handle guild joins/leaves
    this.client.on("guildCreate", (guild) => {
      this.totalUsers += guild.memberCount;
      this.emitStatus();
    });

    this.client.on("guildDelete", (guild) => {
      this.totalUsers -= guild.memberCount;
      this.serverDetailsCache.delete(guild.id);
      this.emitStatus();
    });

    // Handle disconnections
    this.client.on("shardDisconnect", () => {
      this.logger.warn("Bot disconnected from Discord");
      if (this.autoRestart) {
        this.logger.info("Attempting auto-restart...");
        setTimeout(() => this.restart(), 5000);
      }
    });
  }

  // Add new method to update presence
  async updatePresence(presenceData) {
    return await this.presenceManager?.updatePresence(presenceData);
  }

  updateTotalUsers() {
    this.totalUsers = Array.from(this.client.guilds.cache.values()).reduce(
      (total, guild) => total + guild.memberCount,
      0
    );
  }

  async registerApplicationCommands(token) {
    try {
      if (!this.client?.isReady()) {
        throw new Error("Client not ready to register commands");
      }

      this.logger.info("Starting command registration process...");
      this.rest = new REST({ version: "10" }).setToken(token);

      const commands = Array.from(this.commandManager.commands.values()).map(
        (cmd) => ({
          name: cmd.name,
          description: cmd.description,
          options: cmd.options || [],
          default_member_permissions: cmd.permissions || undefined,
          dm_permission: false,
        })
      );

      this.logger.info(`Preparing to register ${commands.length} commands...`, {
        commands: commands.map((c) => c.name),
      });

      // Get all guilds and their existing commands
      const guilds = Array.from(this.client.guilds.cache.values());

      // Register commands for each guild
      for (const guild of guilds) {
        try {
          const result = await this.rest.put(
            Routes.applicationGuildCommands(
              process.env.APPLICATION_ID,
              guild.id
            ),
            { body: commands }
          );

          this.logger.info(
            `Successfully registered commands for guild: ${guild.name}`,
            {
              guildId: guild.id,
              registeredCount: result.length,
              commands: result.map((cmd) => cmd.name),
            }
          );
        } catch (error) {
          this.logger.error(
            `Failed to register commands for guild: ${guild.name}`,
            {
              guildId: guild.id,
              error: error.message,
            }
          );
        }
      }

      this.logger.info("Command registration process complete");
      this.emitCommandsUpdate();
      return true;
    } catch (error) {
      this.logger.error("Failed to register application commands", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async start(token) {
    try {
      this.logger.info("Starting bot...");
      await this.cleanup();
      this.createClient();

      // Set up ready event to register commands
      this.client.once("ready", async () => {
        this.startTime = Date.now();

        // Initialize server cache and total users immediately
        this.client.guilds.cache.forEach((guild) => {
          this.serverDetailsCache.set(guild.id, {
            id: guild.id,
            name: guild.name,
            iconURL: guild.iconURL(),
            memberCount: guild.memberCount,
            timestamp: Date.now(),
          });
        });
        this.updateTotalUsers();

        // Load commands first
        await this.commandManager.loadCommands();
        this.logger.info("Commands loaded", {
          commandCount: this.commandManager.commands.size,
          commands: Array.from(this.commandManager.commands.keys()),
        });

        // Register commands with Discord
        await this.registerApplicationCommands(token);

        // Load and register events after commands are set up
        await this.eventManager.loadEvents();
        this.eventManager.registerEvents();

        // Load saved presence
        await this.presenceManager.loadSavedPresence();

        this.logger.info("Bot initialization complete", {
          username: this.client.user.tag,
          id: this.client.user.id,
          serverCount: this.client.guilds.cache.size,
          totalUsers: this.totalUsers,
          commandCount: this.commandManager.commands.size,
        });

        // Emit initial status immediately
        this.emitStatus();
        this.emitCommandsUpdate();

        // Set up periodic status updates
        setInterval(() => {
          this.emitStatus();
        }, 30000);
      });

      await this.client.login(token);
      return true;
    } catch (error) {
      this.logger.error("Failed to start bot", {
        error: error.message,
        stack: error.stack,
      });
      await this.cleanup();
      throw error;
    }
  }

  async stop() {
    try {
      this.logger.info("Stopping bot...");
      await this.cleanup();
      this.logger.info("Bot stopped successfully");
      return true;
    } catch (error) {
      this.logger.error("Failed to stop bot", {
        error: error.message,
        stack: error.stack,
      });
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
        this.eventManager = null;
        this.rest = null;
      }
      this.startTime = null;
      this.serverDetailsCache.clear();
      this.totalUsers = 0;
      this.emitStatus();
      this.emitCommandsUpdate();
    } catch (error) {
      this.logger.error("Error during cleanup", {
        error: error.message,
        stack: error.stack,
      });
      this.client = null;
      this.eventManager = null;
      this.rest = null;
      this.startTime = null;
      this.serverDetailsCache.clear();
      this.totalUsers = 0;
      this.emitStatus();
      this.emitCommandsUpdate();
    }
  }

  async restart() {
    try {
      this.logger.info("Restarting bot...");
      const token = this.client?.token;
      if (!token) {
        throw new Error("No token available for restart");
      }

      await this.stop();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return await this.start(token);
    } catch (error) {
      this.logger.error("Failed to restart bot", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  getStatus() {
    return {
      online: this.client?.isReady() || false,
      uptime: this.startTime
        ? Math.floor((Date.now() - this.startTime) / 1000)
        : 0,
      commandCount: this.commandManager?.commands.size || 0,
      serverCount: this.client?.guilds.cache.size || 0,
      userCount: this.totalUsers,
    };
  }

  emitStatus() {
    const status = this.getStatus();
    this.emit("statusUpdate", status);
  }

  emitCommandsUpdate() {
    const commands = this.getCommands();
    this.emit("commandsUpdate", commands);
  }

  getServers() {
    if (!this.client?.isReady()) return [];
    return Array.from(this.serverDetailsCache.values());
  }

  async getServerDetails(serverId) {
    if (!this.client?.isReady()) return null;

    try {
      // Check cache first
      const cachedDetails = this.serverDetailsCache.get(serverId);
      const now = Date.now();

      // If we have cached details with channels and roles, and it's less than 5 minutes old
      if (
        cachedDetails?.channels &&
        cachedDetails?.roles &&
        now - cachedDetails.timestamp < 300000
      ) {
        return cachedDetails;
      }

      const guild = await this.client.guilds.fetch(serverId);
      if (!guild) return null;

      // Get basic information first
      const basicInfo = {
        id: guild.id,
        name: guild.name,
        iconURL: guild.iconURL(),
        memberCount: guild.memberCount,
        timestamp: now,
      };

      // Update cache with basic info immediately
      this.serverDetailsCache.set(serverId, basicInfo);

      // Fetch additional details asynchronously
      const [channels, roles] = await Promise.all([
        guild.channels.fetch(),
        guild.roles.fetch(),
      ]);

      // Create detailed server information
      const detailedInfo = {
        ...basicInfo,
        channels: channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
        })),
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
        })),
      };

      // Update cache with detailed info
      this.serverDetailsCache.set(serverId, detailedInfo);

      return detailedInfo;
    } catch (error) {
      this.logger.error("Failed to fetch server details", {
        error: error.message,
        serverId,
      });
      throw error;
    }
  }

  getCommands() {
    if (!this.commandManager) return [];
    return this.commandManager.getCommandList();
  }

  async reloadCommands() {
    if (!this.commandManager) return false;
    const result = await this.commandManager.reloadAllCommands();
    if (result && this.client?.token) {
      await this.registerApplicationCommands(this.client.token);
      this.emitCommandsUpdate();
    }
    return result;
  }

  async reloadEvents() {
    if (!this.eventManager) return false;
    return await this.eventManager.reloadEvents();
  }
}

module.exports = BotManager;
