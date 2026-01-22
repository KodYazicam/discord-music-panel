/**
 * Logger Utility - Winston-based logging system
 */

const winston = require('winston');
const path = require('path');

const { format, transports } = winston;

// Custom format for console output
const consoleFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.colorize(),
    format.printf(({ timestamp, level, message, context, ...meta }) => {
        const ctx = context ? `[${context}]` : '';
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} ${level} ${ctx} ${message} ${metaStr}`.trim();
    })
);

// Custom format for file output
const fileFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json()
);

// Create the base winston logger
const baseLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new transports.Console({
            format: consoleFormat
        }),
        new transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

/**
 * Logger class with context support
 */
class Logger {
    constructor(context = 'App') {
        this.context = context;
    }

    info(message, meta = {}) {
        baseLogger.info(message, { context: this.context, ...meta });
    }

    warn(message, meta = {}) {
        baseLogger.warn(message, { context: this.context, ...meta });
    }

    error(message, meta = {}) {
        if (meta instanceof Error) {
            baseLogger.error(message, { 
                context: this.context, 
                error: meta.message, 
                stack: meta.stack 
            });
        } else {
            baseLogger.error(message, { context: this.context, ...meta });
        }
    }

    debug(message, meta = {}) {
        baseLogger.debug(message, { context: this.context, ...meta });
    }

    verbose(message, meta = {}) {
        baseLogger.verbose(message, { context: this.context, ...meta });
    }

    /**
     * Create a child logger with a different context
     */
    child(context) {
        return new Logger(`${this.context}:${context}`);
    }

    /**
     * Log bot-specific events
     */
    bot(botName, message, meta = {}) {
        baseLogger.info(message, { 
            context: `Bot:${botName}`, 
            ...meta 
        });
    }

    /**
     * Log music-related events
     */
    music(botName, guildId, message, meta = {}) {
        baseLogger.info(message, { 
            context: `Music:${botName}`,
            guildId,
            ...meta 
        });
    }
}

module.exports = { Logger, baseLogger };
