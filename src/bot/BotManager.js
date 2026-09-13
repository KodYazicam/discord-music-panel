/**
 * Bot Manager - Manages multiple Discord bot instances
 * Supports different prefixes (/, ., !, custom text)
 */

const { MusicBot } = require('./MusicBot');
const { Logger } = require('../utils/Logger');
const { botOperations } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

const logger = new Logger('BotManager');

class BotManager {
    constructor(db, io) {
        this.db = db;
        this.io = io;
        this.bots = new Map(); // botId -> MusicBot instance
        this.botConfigs = new Map(); // botId -> config
    }

    /**
     * Create a new bot configuration
     */
    async createBot(config) {
        const botId = config.id || uuidv4();
        
        const botConfig = {
            id: botId,
            name: config.name,
            token: config.token,
            clientId: config.clientId,
            prefix: config.prefix || '!',
            prefixType: config.prefixType || 'text', // 'slash', 'text', 'both'
            autoStart: config.autoStart || false,
            createdBy: config.createdBy
        };

        try {
            botOperations.create(botConfig);
            this.botConfigs.set(botId, botConfig);
            
            logger.info(`Bot created: ${config.name} (${botId}) with prefix "${config.prefix}"`);
            
            this.emitBotUpdate(botId, 'created');
            const bot = botOperations.getById(botId);
            return { success: true, botId, bot, message: 'Bot created successfully' };
        } catch (error) {
            logger.error(`Failed to create bot: ${error.message}`);
            throw error;
        }
    }

    /**
     * Start a bot instance
     */
    async startBot(botId) {
        // Check if already running
        if (this.bots.has(botId)) {
            const existingBot = this.bots.get(botId);
            if (existingBot.isConnected()) {
                return { success: false, message: 'Bot is already running' };
            }
        }

        // Get bot config from database
        const config = botOperations.getById(botId);
        if (!config) {
            return { success: false, message: 'Bot not found' };
        }

        try {
            logger.info(`Starting bot: ${config.name} (${botId})`);
            
            // Create new MusicBot instance
            const musicBot = new MusicBot({
                id: config.id,
                name: config.name,
                token: config.token,
                clientId: config.client_id,
                prefix: config.prefix,
                prefixType: config.prefix_type,
                volume: config.volume || 100,
                maxQueueSize: config.max_queue_size || 500,
                defaultSearchEngine: config.default_search_engine || 'youtube',
                announceSongs: config.announce_songs === 1,
                deleteBotMessages: config.delete_bot_messages === 1,
                stayInChannel: config.stay_in_channel === 1,
                djRoleId: config.dj_role_id
            }, this.db, this.io);

            // Start the bot
            await musicBot.start();
            
            // Store the instance
            this.bots.set(botId, musicBot);
            
            // Update status in database
            botOperations.updateStatus(botId, 'online');
            
            this.emitBotUpdate(botId, 'started');
            
            logger.info(`Bot started successfully: ${config.name}`);
            return { success: true, message: 'Bot started successfully' };
        } catch (error) {
            logger.error(`Failed to start bot ${botId}:`, error);
            botOperations.updateStatus(botId, 'error');
            this.emitBotUpdate(botId, 'error', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Stop a bot instance
     */
    async stopBot(botId) {
        const bot = this.bots.get(botId);
        if (!bot) {
            return { success: false, message: 'Bot is not running' };
        }

        try {
            logger.info(`Stopping bot: ${botId}`);
            
            await bot.stop();
            this.bots.delete(botId);
            
            botOperations.updateStatus(botId, 'offline');
            this.emitBotUpdate(botId, 'stopped');
            
            return { success: true, message: 'Bot stopped successfully' };
        } catch (error) {
            logger.error(`Failed to stop bot ${botId}:`, error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Restart a bot instance
     */
    async restartBot(botId) {
        await this.stopBot(botId);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return await this.startBot(botId);
    }

    /**
     * Delete a bot configuration
     */
    async deleteBot(botId) {
        // Stop if running
        if (this.bots.has(botId)) {
            await this.stopBot(botId);
        }

        try {
            botOperations.delete(botId);
            this.botConfigs.delete(botId);
            
            logger.info(`Bot deleted: ${botId}`);
            this.emitBotUpdate(botId, 'deleted');
            
            return { success: true, message: 'Bot deleted successfully' };
        } catch (error) {
            logger.error(`Failed to delete bot ${botId}:`, error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Update bot configuration
     */
    async updateBot(botId, updates) {
        try {
            // Map camelCase to snake_case for database
            const dbUpdates = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.prefix !== undefined) dbUpdates.prefix = updates.prefix;
            if (updates.prefixType !== undefined) dbUpdates.prefix_type = updates.prefixType;
            if (updates.autoStart !== undefined) dbUpdates.auto_start = updates.autoStart ? 1 : 0;
            if (updates.volume !== undefined) dbUpdates.volume = updates.volume;
            if (updates.maxQueueSize !== undefined) dbUpdates.max_queue_size = updates.maxQueueSize;
            if (updates.defaultSearchEngine !== undefined) dbUpdates.default_search_engine = updates.defaultSearchEngine;
            if (updates.announceSongs !== undefined) dbUpdates.announce_songs = updates.announceSongs ? 1 : 0;
            if (updates.deleteBotMessages !== undefined) dbUpdates.delete_bot_messages = updates.deleteBotMessages ? 1 : 0;
            if (updates.stayInChannel !== undefined) dbUpdates.stay_in_channel = updates.stayInChannel ? 1 : 0;
            if (updates.djRoleId !== undefined) dbUpdates.dj_role_id = updates.djRoleId;
            if (updates.activityType !== undefined) dbUpdates.activity_type = updates.activityType;
            if (updates.activityText !== undefined) dbUpdates.activity_text = updates.activityText;
            if (updates.token !== undefined) dbUpdates.token = updates.token;
            if (updates.settings !== undefined) {
                const extra = { ...updates.settings };
                delete extra.token;
                dbUpdates.extra_settings = JSON.stringify(extra);
                if (updates.settings.defaultVolume !== undefined) dbUpdates.volume = updates.settings.defaultVolume;
                if (updates.settings.maxQueueSize !== undefined) dbUpdates.max_queue_size = updates.settings.maxQueueSize;
                if (updates.settings.announceNowPlaying !== undefined) dbUpdates.announce_songs = updates.settings.announceNowPlaying ? 1 : 0;
                if (updates.settings.deleteCommandMessages !== undefined) dbUpdates.delete_bot_messages = updates.settings.deleteCommandMessages ? 1 : 0;
                if (updates.settings.stayInVoice !== undefined) dbUpdates.stay_in_channel = updates.settings.stayInVoice ? 1 : 0;
                if (updates.settings.djRoleId !== undefined) dbUpdates.dj_role_id = updates.settings.djRoleId;
                if (updates.settings.activityType !== undefined) dbUpdates.activity_type = updates.settings.activityType;
                if (updates.settings.activityText !== undefined) dbUpdates.activity_text = updates.settings.activityText;
                if (updates.settings.status !== undefined) dbUpdates.status = updates.settings.status;
            }

            botOperations.update(botId, dbUpdates);
            
            // If bot is running, apply updates dynamically
            const bot = this.bots.get(botId);
            if (bot) {
                bot.updateConfig(updates);
            }
            
            this.emitBotUpdate(botId, 'updated');
            
            return { success: true, message: 'Bot updated successfully' };
        } catch (error) {
            logger.error(`Failed to update bot ${botId}:`, error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get all bots with their current status
     */
    getAllBots() {
        const dbBots = botOperations.getAll();
        
        return dbBots.map(bot => ({
            id: bot.id,
            name: bot.name,
            clientId: bot.client_id,
            prefix: bot.prefix,
            prefixType: bot.prefix_type,
            status: this.bots.has(bot.id) && this.bots.get(bot.id).isConnected() ? 'online' : 'offline',
            autoStart: bot.auto_start === 1,
            volume: bot.volume,
            maxQueueSize: bot.max_queue_size,
            defaultSearchEngine: bot.default_search_engine,
            announceSongs: bot.announce_songs === 1,
            deleteBotMessages: bot.delete_bot_messages === 1,
            stayInChannel: bot.stay_in_channel === 1,
            djRoleId: bot.dj_role_id,
            activityType: bot.activity_type,
            activityText: bot.activity_text,
            createdAt: bot.created_at,
            updatedAt: bot.updated_at,
            createdBy: bot.created_by,
            created_by: bot.created_by,
            settings: parseExtraSettings(bot.extra_settings),
            ...(this.bots.has(bot.id) ? this.bots.get(bot.id).getStats() : {})
        }));
    }

    /**
     * Get a specific bot's details
     */
    getBot(botId) {
        const bot = botOperations.getById(botId);
        if (!bot) return null;

        const runningBot = this.bots.get(botId);
        
        return {
            id: bot.id,
            name: bot.name,
            clientId: bot.client_id,
            prefix: bot.prefix,
            prefixType: bot.prefix_type,
            status: runningBot?.isConnected() ? 'online' : 'offline',
            autoStart: bot.auto_start === 1,
            volume: bot.volume,
            maxQueueSize: bot.max_queue_size,
            defaultSearchEngine: bot.default_search_engine,
            announceSongs: bot.announce_songs === 1,
            deleteBotMessages: bot.delete_bot_messages === 1,
            stayInChannel: bot.stay_in_channel === 1,
            djRoleId: bot.dj_role_id,
            activityType: bot.activity_type,
            activityText: bot.activity_text,
            createdAt: bot.created_at,
            updatedAt: bot.updated_at,
            createdBy: bot.created_by,
            created_by: bot.created_by,
            settings: parseExtraSettings(bot.extra_settings),
            ...(runningBot ? runningBot.getStats() : {})
        };
    }

    /**
     * Get bot's guilds
     */
    getBotGuilds(botId) {
        const bot = this.bots.get(botId);
        if (!bot || !bot.isConnected()) {
            return [];
        }
        return bot.getGuilds();
    }

    /**
     * Get queue for a specific guild
     */
    getQueue(botId, guildId) {
        const bot = this.bots.get(botId);
        if (!bot) return null;
        return bot.getQueue(guildId);
    }

    /**
     * Execute a music command
     */
    async executeCommand(botId, guildId, command, args = {}) {
        const bot = this.bots.get(botId);
        if (!bot || !bot.isConnected()) {
            return { success: false, message: 'Bot is not running' };
        }

        try {
            return await bot.executeCommand(guildId, command, args);
        } catch (error) {
            logger.error(`Command execution failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Auto-start all bots marked for auto-start
     */
    async autoStartBots() {
        const autoStartBots = botOperations.getAutoStartBots();
        
        logger.info(`Auto-starting ${autoStartBots.length} bot(s)...`);
        
        for (const bot of autoStartBots) {
            try {
                await this.startBot(bot.id);
                // Add a small delay between starts
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                logger.error(`Failed to auto-start bot ${bot.name}:`, error);
            }
        }
    }

    /**
     * Stop all running bots
     */
    async stopAllBots() {
        logger.info('Stopping all bots...');
        
        const stopPromises = [];
        for (const [botId] of this.bots) {
            stopPromises.push(this.stopBot(botId));
        }
        
        await Promise.all(stopPromises);
        logger.info('All bots stopped');
    }

    /**
     * Get running bot count
     */
    getRunningCount() {
        let count = 0;
        for (const [, bot] of this.bots) {
            if (bot.isConnected()) count++;
        }
        return count;
    }

    /**
     * Get total guild count across all bots
     */
    getTotalGuildCount() {
        let count = 0;
        for (const [, bot] of this.bots) {
            if (bot.isConnected()) {
                count += bot.getGuildCount();
            }
        }
        return count;
    }

    /**
     * Get global statistics
     */
    getGlobalStats() {
        let totalGuilds = 0;
        let totalPlaying = 0;
        let totalQueued = 0;
        let totalUsers = 0;

        for (const [, bot] of this.bots) {
            if (bot.isConnected()) {
                const stats = bot.getStats();
                totalGuilds += stats.guildCount || 0;
                totalPlaying += stats.playingCount || 0;
                totalQueued += stats.totalQueuedSongs || 0;
                totalUsers += stats.totalUsers || 0;
            }
        }

        return {
            runningBots: this.getRunningCount(),
            totalBots: botOperations.getAll().length,
            totalGuilds,
            totalPlaying,
            totalQueued,
            totalUsers
        };
    }

    /**
     * Emit bot update event to connected clients
     */
    emitBotUpdate(botId, event, data = null) {
        this.io.emit('bot:update', {
            botId,
            event,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Emit queue update event
     */
    emitQueueUpdate(botId, guildId, queue) {
        this.io.emit('queue:update', {
            botId,
            guildId,
            queue,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Emit now playing update
     */
    emitNowPlaying(botId, guildId, track) {
        this.io.emit('nowplaying:update', {
            botId,
            guildId,
            track,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get a running bot instance
     */
    getRunningBot(botId) {
        return this.bots.get(botId);
    }
}

function parseExtraSettings(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

module.exports = { BotManager };
