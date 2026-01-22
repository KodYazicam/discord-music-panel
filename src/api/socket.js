/**
 * Socket.io Handlers - Real-time communication
 */

const jwt = require('jsonwebtoken');
const { Logger } = require('../utils/Logger');

const logger = new Logger('Socket');
const JWT_SECRET = process.env.JWT_SECRET || 'discord-music-panel-jwt-secret';

/**
 * Setup Socket.io event handlers
 */
function setupSocketHandlers(io, botManager, db) {
    // Authentication middleware for socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.user.username} (${socket.id})`);

        // Join user-specific room
        socket.join(`user:${socket.user.id}`);

        // ==================== Bot Events ====================

        /**
         * Subscribe to bot updates
         */
        socket.on('bot:subscribe', (botId) => {
            socket.join(`bot:${botId}`);
            logger.debug(`${socket.user.username} subscribed to bot ${botId}`);
        });

        /**
         * Unsubscribe from bot updates
         */
        socket.on('bot:unsubscribe', (botId) => {
            socket.leave(`bot:${botId}`);
            logger.debug(`${socket.user.username} unsubscribed from bot ${botId}`);
        });

        /**
         * Start a bot
         */
        socket.on('bot:start', async (botId, callback) => {
            try {
                const result = await botManager.startBot(botId);
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Stop a bot
         */
        socket.on('bot:stop', async (botId, callback) => {
            try {
                const result = await botManager.stopBot(botId);
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Restart a bot
         */
        socket.on('bot:restart', async (botId, callback) => {
            try {
                const result = await botManager.restartBot(botId);
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Get bot status
         */
        socket.on('bot:status', (botId, callback) => {
            try {
                const bot = botManager.getBot(botId);
                callback({ success: true, bot });
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Get all bots
         */
        socket.on('bots:list', (callback) => {
            try {
                const bots = botManager.getAllBots();
                callback({ success: true, bots });
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        // ==================== Guild Events ====================

        /**
         * Subscribe to guild updates
         */
        socket.on('guild:subscribe', ({ botId, guildId }) => {
            socket.join(`guild:${botId}:${guildId}`);
            logger.debug(`${socket.user.username} subscribed to guild ${guildId} on bot ${botId}`);
        });

        /**
         * Unsubscribe from guild updates
         */
        socket.on('guild:unsubscribe', ({ botId, guildId }) => {
            socket.leave(`guild:${botId}:${guildId}`);
        });

        /**
         * Get guild list for a bot
         */
        socket.on('guilds:list', (botId, callback) => {
            try {
                const guilds = botManager.getBotGuilds(botId);
                callback({ success: true, guilds });
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        // ==================== Queue Events ====================

        /**
         * Get queue for a guild
         */
        socket.on('queue:get', ({ botId, guildId }, callback) => {
            try {
                const queue = botManager.getQueue(botId, guildId);
                callback({ success: true, queue });
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        // ==================== Music Control Events ====================

        /**
         * Play a song
         */
        socket.on('music:play', async ({ botId, guildId, query, voiceChannelId, textChannelId }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'play', {
                    query,
                    voiceChannelId,
                    textChannelId
                });
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Pause playback
         */
        socket.on('music:pause', async ({ botId, guildId }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'pause');
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Resume playback
         */
        socket.on('music:resume', async ({ botId, guildId }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'resume');
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Skip current track
         */
        socket.on('music:skip', async ({ botId, guildId }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'skip');
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Stop playback
         */
        socket.on('music:stop', async ({ botId, guildId }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'stop');
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Set volume
         */
        socket.on('music:volume', async ({ botId, guildId, volume }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'volume', { volume });
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Shuffle queue
         */
        socket.on('music:shuffle', async ({ botId, guildId }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'shuffle');
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Set loop mode
         */
        socket.on('music:loop', async ({ botId, guildId, mode }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'loop', { mode });
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Remove track from queue
         */
        socket.on('music:remove', async ({ botId, guildId, index }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'remove', { index });
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Clear queue
         */
        socket.on('music:clear', async ({ botId, guildId }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'clear');
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Move track in queue
         */
        socket.on('music:move', async ({ botId, guildId, from, to }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'move', { from, to });
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Jump to track
         */
        socket.on('music:jump', async ({ botId, guildId, index }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'jump', { index });
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        /**
         * Leave voice channel
         */
        socket.on('music:leave', async ({ botId, guildId }, callback) => {
            try {
                const result = await botManager.executeCommand(botId, guildId, 'leave');
                callback(result);
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        // ==================== Stats Events ====================

        /**
         * Get global stats
         */
        socket.on('stats:global', (callback) => {
            try {
                const stats = botManager.getGlobalStats();
                callback({ success: true, stats });
            } catch (error) {
                callback({ success: false, error: error.message });
            }
        });

        // ==================== Disconnect ====================

        socket.on('disconnect', (reason) => {
            logger.info(`Client disconnected: ${socket.user.username} (${reason})`);
        });

        socket.on('error', (error) => {
            logger.error(`Socket error for ${socket.user.username}:`, error);
        });
    });

    // ==================== Broadcast Helpers ====================

    /**
     * Broadcast bot update to subscribers
     */
    botManager.emitBotUpdate = (botId, event, data) => {
        io.to(`bot:${botId}`).emit('bot:update', { botId, event, data, timestamp: new Date().toISOString() });
        io.emit('bots:update', { botId, event, timestamp: new Date().toISOString() });
    };

    /**
     * Broadcast queue update
     */
    botManager.emitQueueUpdate = (botId, guildId, queue) => {
        io.to(`guild:${botId}:${guildId}`).emit('queue:update', {
            botId,
            guildId,
            queue,
            timestamp: new Date().toISOString()
        });
    };

    /**
     * Broadcast now playing update
     */
    botManager.emitNowPlaying = (botId, guildId, track) => {
        io.to(`guild:${botId}:${guildId}`).emit('nowplaying:update', {
            botId,
            guildId,
            track,
            timestamp: new Date().toISOString()
        });
    };

    logger.info('Socket handlers initialized');
}

module.exports = { setupSocketHandlers };
