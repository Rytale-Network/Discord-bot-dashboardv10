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
        this.maxLogsInMemory = 1000;
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

    filterLogs(options = {}) {
        const { level, range } = options;
        let filteredLogs = [...this.logs];

        if (level && level !== 'all') {
            const levels = {
                'info': ['info'],
                'warn': ['warn', 'error'],
                'error': ['error']
            };
            const allowedLevels = levels[level] || [];
            filteredLogs = filteredLogs.filter(log => allowedLevels.includes(log.level));
        }

        if (range && range !== 'all') {
            const now = new Date();
            const ranges = {
                'hour': 60 * 60 * 1000,
                'day': 24 * 60 * 60 * 1000,
                'week': 7 * 24 * 60 * 60 * 1000
            };
            const timeRange = ranges[range] || 0;
            filteredLogs = filteredLogs.filter(log => {
                const logTime = new Date(log.timestamp);
                return (now - logTime) <= timeRange;
            });
        }

        return filteredLogs;
    }

    async getLogs(options = {}) {
        return this.filterLogs(options);
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

    formatLogsForExport(logs) {
        return logs.map(log => {
            let entry = `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
            if (log.meta && Object.keys(log.meta).length > 0) {
                entry += `\n${JSON.stringify(log.meta, null, 2)}`;
            }
            return entry;
        }).join('\n');
    }

    async saveLogsToFile(filepath, options = {}) {
        const logs = this.filterLogs(options);
        const content = this.formatLogsForExport(logs);
        await fs.promises.writeFile(filepath, content, 'utf8');
    }
}

module.exports = LogManager;
