const fs = require('fs').promises;
const path = require('path');

class EventManager {
    constructor(botManager) {
        this.bot = botManager;
        this.events = new Map();
        this.eventsPath = path.join(__dirname, '../events');
    }

    async loadEvents() {
        try {
            // Create events directory if it doesn't exist
            try {
                await fs.access(this.eventsPath);
            } catch {
                await fs.mkdir(this.eventsPath, { recursive: true });
                this.bot.logger.info('Created events directory');
            }

            // Read event files
            const eventFiles = await fs.readdir(this.eventsPath);
            const jsFiles = eventFiles.filter(file => file.endsWith('.js'));

            this.bot.logger.info(`Loading ${jsFiles.length} events...`);

            for (const file of jsFiles) {
                try {
                    const filePath = path.join(this.eventsPath, file);
                    // Clear require cache to reload events
                    delete require.cache[require.resolve(filePath)];
                    const event = require(filePath);

                    if ('name' in event && 'execute' in event) {
                        this.events.set(event.name, event);
                        this.bot.logger.debug(`Loaded event: ${event.name}`);
                    } else {
                        this.bot.logger.warn(`Invalid event file: ${file}`);
                    }
                } catch (error) {
                    this.bot.logger.error(`Error loading event file: ${file}`, {
                        error: error.message,
                        stack: error.stack
                    });
                }
            }

            this.bot.logger.info(`Loaded ${this.events.size} events successfully`);
        } catch (error) {
            this.bot.logger.error('Failed to load events', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    registerEvents(client) {
        for (const [eventName, event] of this.events) {
            if (event.once) {
                client.once(eventName, (...args) => this.handleEvent(event, ...args));
            } else {
                client.on(eventName, (...args) => this.handleEvent(event, ...args));
            }
            this.bot.logger.debug(`Registered event handler: ${eventName}`);
        }
    }

    async handleEvent(event, ...args) {
        try {
            this.bot.logger.debug(`Executing event: ${event.name}`);
            await event.execute(this.bot, ...args);
        } catch (error) {
            this.bot.logger.error(`Error handling event: ${event.name}`, {
                error: error.message,
                stack: error.stack
            });
        }
    }

    async reloadEvents() {
        try {
            this.events.clear();
            await this.loadEvents();
            if (this.bot.client) {
                this.bot.client.removeAllListeners();
                this.bot.setupEventListeners();
            }
            this.bot.logger.info('Events reloaded successfully');
            return true;
        } catch (error) {
            this.bot.logger.error('Failed to reload events', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    getEvents() {
        return Array.from(this.events.values()).map(event => ({
            name: event.name,
            description: event.description || 'No description provided',
            once: event.once || false
        }));
    }
}

module.exports = EventManager;
