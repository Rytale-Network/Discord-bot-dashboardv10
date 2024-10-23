const fs = require('fs');
const path = require('path');

class EventManager {
    constructor(client, logger, commandManager) {
        this.client = client;
        this.logger = logger;
        this.commandManager = commandManager;
        this.events = new Map();
        this.handledInteractions = new Set();
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, '..', 'events');
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            try {
                const filePath = path.join(eventsPath, file);
                // Clear cache to ensure fresh load
                delete require.cache[require.resolve(filePath)];
                const eventModule = require(filePath);

                if ('name' in eventModule && 'events' in eventModule) {
                    this.events.set(eventModule.name, eventModule.events);
                    this.logger.info(`Loaded event module: ${eventModule.name}`, {
                        file: file,
                        events: Object.keys(eventModule.events)
                    });
                } else {
                    this.logger.warn(`Invalid event module file: ${file}`, {
                        reason: 'Missing required "name" or "events" property'
                    });
                }
            } catch (error) {
                this.logger.error(`Failed to load event module file: ${file}`, {
                    error: error.message,
                    stack: error.stack
                });
            }
        }
    }

    registerEvents() {
        // Register all events from loaded modules
        for (const [moduleName, events] of this.events) {
            for (const [eventName, handler] of Object.entries(events)) {
                this.client.on(eventName, async (...args) => {
                    try {
                        // Special handling for interactions
                        if (eventName === 'interactionCreate') {
                            const interaction = args[0];
                            if (this.handledInteractions.has(interaction.id)) {
                                return;
                            }
                            this.handledInteractions.add(interaction.id);
                            
                            // Clean up old interaction IDs after 5 minutes
                            setTimeout(() => {
                                this.handledInteractions.delete(interaction.id);
                            }, 5 * 60 * 1000);

                            // Get fresh commands collection
                            const commands = this.commandManager.getAllCommands();
                            await handler(...args, this.logger, commands);
                        } else {
                            await handler(...args, this.logger, this.commandManager.getAllCommands());
                        }
                    } catch (error) {
                        this.logger.error(`Error in event handler: ${eventName}`, {
                            module: moduleName,
                            error: error.message,
                            stack: error.stack
                        });
                    }
                });

                this.logger.info(`Registered event handler`, {
                    module: moduleName,
                    event: eventName
                });
            }
        }

        // Register core client events
        this.registerCoreEvents();
    }

    registerCoreEvents() {
        // Ready event
        this.client.once('ready', () => {
            this.logger.info('Bot is ready!', {
                username: this.client.user.tag,
                guilds: this.client.guilds.cache.size,
                commands: this.commandManager.getAllCommands().size
            });
        });

        // Error handling
        this.client.on('error', error => {
            this.logger.error('Discord client error', {
                error: error.message,
                stack: error.stack
            });
        });

        // Debug logging
        this.client.on('debug', info => {
            this.logger.debug('Discord debug', { info });
        });

        // Warn logging
        this.client.on('warn', info => {
            this.logger.warn('Discord warning', { info });
        });

        // Shard events (if using sharding)
        if (this.client.shard) {
            this.client.shard.on('death', (process) => {
                this.logger.error('Shard death', {
                    processId: process.id,
                    exitCode: process.exitCode
                });
            });

            this.client.shard.on('ready', (shardId) => {
                this.logger.info('Shard ready', { shardId });
            });

            this.client.shard.on('disconnect', (shardId) => {
                this.logger.warn('Shard disconnected', { shardId });
            });

            this.client.shard.on('reconnecting', (shardId) => {
                this.logger.info('Shard reconnecting', { shardId });
            });
        }

        // Rate limit handling
        this.client.rest.on('rateLimited', (info) => {
            this.logger.warn('Rate limited', {
                timeout: info.timeout,
                limit: info.limit,
                method: info.method,
                path: info.path,
                route: info.route
            });
        });
    }

    async reloadEvents() {
        try {
            // Remove all existing listeners
            this.client.removeAllListeners();
            this.events.clear();
            this.handledInteractions.clear();

            // Clear event module cache
            const eventsPath = path.join(__dirname, '..', 'events');
            const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

            for (const file of eventFiles) {
                const filePath = path.join(eventsPath, file);
                delete require.cache[require.resolve(filePath)];
            }

            // Reload and register events
            await this.loadEvents();
            this.registerEvents();

            this.logger.info('Successfully reloaded all events', {
                moduleCount: this.events.size
            });
            return true;
        } catch (error) {
            this.logger.error('Failed to reload events', {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    getRegisteredEvents() {
        const events = {};
        for (const [moduleName, moduleEvents] of this.events) {
            events[moduleName] = Object.keys(moduleEvents);
        }
        return events;
    }
}

module.exports = EventManager;
