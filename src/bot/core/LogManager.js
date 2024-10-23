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
        this.logLevel = 'info';
        this.fileLoggingEnabled = false;
        this.retentionDays = 7;
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    setLevel(level) {
        if (this.logLevels[level] !== undefined) {
            const oldLevel = this.logLevel;
            this.logLevel = level;
            this.emit('log', {
                timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                level: 'info',
                message: `Log level changed from ${oldLevel} to ${level}`
            });
        }
    }

    setFileLogging(enabled) {
        const wasEnabled = this.fileLoggingEnabled;
        this.fileLoggingEnabled = enabled;
        
        if (enabled && this.logPath) {
            if (!wasEnabled) {
                this.emit('log', {
                    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                    level: 'info',
                    message: 'File logging enabled'
                });
            }
            this.rotateLogFile();
        } else if (!enabled && this.currentStream) {
            if (wasEnabled) {
                this.emit('log', {
                    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                    level: 'info',
                    message: 'File logging disabled'
                });
            }
            this.currentStream.end();
            this.currentStream = null;
        }
    }

    setRetentionDays(days) {
        const oldDays = this.retentionDays;
        this.retentionDays = days;
        this.emit('log', {
            timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            level: 'info',
            message: `Log retention changed from ${oldDays} to ${days} days`
        });
        this.cleanOldLogs();
    }

    async cleanOldLogs() {
        if (!this.logPath || !this.fileLoggingEnabled) return;

        try {
            const files = await fs.promises.readdir(this.logPath);
            const now = new Date();
            let deletedCount = 0;

            for (const file of files) {
                if (!file.endsWith('.log')) continue;

                const filePath = path.join(this.logPath, file);
                const stats = await fs.promises.stat(filePath);
                const daysOld = (now - stats.mtime) / (1000 * 60 * 60 * 24);

                if (daysOld > this.retentionDays) {
                    await fs.promises.unlink(filePath);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                this.emit('log', {
                    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                    level: 'info',
                    message: `Cleaned up ${deletedCount} old log files`
                });
            }
        } catch (error) {
            this.emit('log', {
                timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                level: 'error',
                message: 'Failed to clean old logs',
                meta: { error: error.message }
            });
        }
    }

    setLogPath(logPath) {
        this.logPath = logPath;
        if (!fs.existsSync(logPath)) {
            fs.mkdirSync(logPath, { recursive: true });
        }
        if (this.fileLoggingEnabled) {
            this.rotateLogFile();
        }
        this.cleanOldLogs();
    }

    rotateLogFile() {
        if (!this.fileLoggingEnabled) return;

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

    shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.logLevel];
    }

    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

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

        // Write to file if enabled
        if (this.fileLoggingEnabled && this.currentStream) {
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

    async saveLogsToFile(filepath, options = {}) {
        const logs = await this.getLogs(options);
        const content = logs
            .map(log => {
                let entry = `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
                if (log.meta && Object.keys(log.meta).length > 0) {
                    entry += `\n${JSON.stringify(log.meta, null, 2)}`;
                }
                return entry;
            })
            .join('\n');

        await fs.promises.writeFile(filepath, content, 'utf8');
    }
}

module.exports = LogManager;
