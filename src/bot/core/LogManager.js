const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { format } = require('date-fns');

class LogManager extends EventEmitter {
    constructor() {
        super();
        this.logPath = null;
        this.currentLogFile = null;
        this.currentStream = null;
        this.logs = [];
        this.maxLogsInMemory = 1000; // Keep last 1000 logs in memory
    }

    setLogPath(logPath) {
        this.logPath = logPath;
        if (!fs.existsSync(logPath)) {
            fs.mkdirSync(logPath, { recursive: true });
        }
        this.rotateLogFile();
    }

    rotateLogFile() {
        if (this.currentStream) {
            this.currentStream.end();
        }

        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
        this.currentLogFile = path.join(this.logPath, `bot_${timestamp}.log`);
        this.currentStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    }

    formatLogEntry(level, message, meta = {}) {
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const logEntry = {
            timestamp,
            level,
            message,
            ...(Object.keys(meta).length > 0 ? { meta } : {})
        };

        let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        if (Object.keys(meta).length > 0) {
            if (meta.error && typeof meta.error === 'string') {
                formatted += `\nError: ${meta.error}`;
            } else {
                formatted += `\n${JSON.stringify(meta, null, 2)}`;
            }
        }

        return { entry: logEntry, formatted };
    }

    log(level, message, meta = {}) {
        if (!this.logPath) {
            console.log(`${level.toUpperCase()}: ${message}`);
            return;
        }

        // Clean up meta object
        const cleanMeta = {};
        Object.entries(meta).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                cleanMeta[key] = value;
            }
        });

        const { entry, formatted } = this.formatLogEntry(level, message, cleanMeta);

        // Store in memory
        this.logs.push(entry);
        if (this.logs.length > this.maxLogsInMemory) {
            this.logs.shift();
        }

        // Write to file
        if (this.currentStream) {
            this.currentStream.write(formatted + '\n');
        }

        // Emit for real-time updates
        this.emit('log', entry);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    async getLogs(options = {}) {
        const {
            limit = 100,
            level,
            startDate,
            endDate,
            search
        } = options;

        let filteredLogs = [...this.logs];

        if (level) {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }

        if (startDate) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(startDate));
        }

        if (endDate) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(endDate));
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filteredLogs = filteredLogs.filter(log =>
                log.message.toLowerCase().includes(searchLower) ||
                JSON.stringify(log.meta || {}).toLowerCase().includes(searchLower)
            );
        }

        return filteredLogs.slice(-limit);
    }

    async getLogFiles() {
        if (!this.logPath) return [];

        const files = await fs.promises.readdir(this.logPath);
        return files
            .filter(file => file.endsWith('.log'))
            .map(file => ({
                name: file,
                path: path.join(this.logPath, file),
                timestamp: format(
                    new Date(file.replace('bot_', '').replace('.log', '').replace(/_/g, ' ')),
                    'yyyy-MM-dd HH:mm:ss'
                )
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    async exportLogs(options = {}) {
        const logs = await this.getLogs(options);
        return logs
            .map(log => {
                let entry = `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
                if (log.meta && Object.keys(log.meta).length > 0) {
                    entry += `\n${JSON.stringify(log.meta, null, 2)}`;
                }
                return entry;
            })
            .join('\n');
    }

    async saveLogsToFile(filepath, options = {}) {
        const logsContent = await this.exportLogs(options);
        await fs.promises.writeFile(filepath, logsContent, 'utf8');
    }
}

module.exports = LogManager;
