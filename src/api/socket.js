/**
 * Socket.io Handlers - Real-time communication
 */

const jwt = require('jsonwebtoken');
const { Logger } = require('../utils/Logger');
const { isAdmin, requireBotAccess, resolveSessionUser } = require('../utils/access');
const { getJwtSecret } = require('../utils/jwt-secret');

const logger = new Logger('Socket');

/**
 * Setup Socket.io event handlers
 */
function setupSocketHandlers(io, botManager, db) {
    const JWT_SECRET = getJwtSecret();
    // Authentication middleware for socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = resolveSessionUser(decoded);
            if (!user) {
                return next(new Error('Invalid token'));
            }
            socket.user = user;
            next();
        } catch (error) {
            return next(new Error('Invalid token'));
        }
    });

    const SESSION_INVALID = 'Session is no longer valid';

    /**
     * Re-read the account behind an authenticated socket.
     *
     * The handshake proves the token was valid once; it does not prove the
     * account still exists or keeps the role stored in the socket snapshot.
     * Every user-driven event re-reads the row so an open dashboard tab cannot
     * outlive a deleted or demoted account.
     */
    const refreshSocketUser = (socket) => {
        const user = resolveSessionUser({ id: socket.user?.id });
        if (!user) return null;
        socket.user = user;
        return user;
    };

    /**
     * Close a socket whose account no longer exists. The disconnect is
     * deferred so the error acknowledgement for the current event can flush
     * before the transport closes.
     */
    const endSession = (socket) => {
        if (socket.sessionEnded) return;
        socket.sessionEnded = true;
        setImmediate(() => {
            try {
                socket.disconnect(true);
            } catch (error) {
                logger.debug(`Socket already closed: ${error.message}`);
            }
        });
    };

    const guard = (socket, botId) => {
        if (!refreshSocketUser(socket)) {
            endSession(socket);
            return { error: SESSION_INVALID, status: 401 };
        }
        const fakeReq = { user: socket.user };
        return requireBotAccess(fakeReq, botId);
    };

    /**
     * Reply only when the client supplied an acknowledgement callback.
     * Socket.IO passes no callback for `socket.emit(event, payload)`, so an
     * unconditional call throws from the listener and can take the process
     * down through the uncaughtException handler.
     */
    const respond = (callback, payload) => {
        if (typeof callback === 'function') {
            callback(payload);
        }
    };

    /**
     * Reply to a per-bot request without leaking bot data when the caller
     * is not allowed to manage the bot.
     */
    const denyAccess = (callback, access) => respond(callback, { success: false, error: access.error });

    /**
     * Register a listener that cannot crash the process.
     *
     * Socket.IO does not catch listener errors and does not await the promise
     * an async listener returns. A malformed packet (missing payload, null,
     * wrong type) would otherwise reach uncaughtException in src/index.js,
     * which exits the process, or surface as an unhandled rejection.
     */
    const listenOn = (socket, event, handler) => {
        socket.on(event, (...args) => {
            try {
                // A JSON null payload is as malformed as a missing one: let the
                // handler's `= {}` default apply instead of destructuring null.
                if (args.length > 0 && args[0] === null) args[0] = undefined;
                const result = handler(...args);
                if (result && typeof result.then === 'function') {
                    return result.catch((error) => {
                        logger.error(`Socket ${event} failed:`, error);
                    });
                }
                return result;
            } catch (error) {
                logger.error(`Socket ${event} failed:`, error);
                return undefined;
            }
        });
    };

    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.user.username} (${socket.id})`);

        socket.join(`user:${socket.user.id}`);
        const listen = (event, handler) => listenOn(socket, event, handler);

        const subscribeBot = (botId) => {
            const access = guard(socket, botId);
            if (access.error) return false;
            socket.join(`bot:${botId}`);
            return true;
        };

        listen('bot:subscribe', (botId) => {
            if (!botId) return;
            subscribeBot(botId);
        });
        listen('join:bot', ({ botId } = {}) => {
            if (botId) subscribeBot(botId);
        });
        listen('leave:bot', ({ botId } = {}) => {
            if (botId) socket.leave(`bot:${botId}`);
        });

        /**
         * Unsubscribe from bot updates
         */
        listen('bot:unsubscribe', (botId) => {
            if (!botId) return;
            socket.leave(`bot:${botId}`);
            logger.debug(`${socket.user.username} unsubscribed from bot ${botId}`);
        });

        /**
         * Start a bot
         */
        listen('bot:start', async (botId, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return respond(callback, { success: false, error: access.error });
                const result = await botManager.startBot(botId);
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Stop a bot
         */
        listen('bot:stop', async (botId, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return respond(callback, { success: false, error: access.error });
                const result = await botManager.stopBot(botId);
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Restart a bot
         */
        listen('bot:restart', async (botId, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return respond(callback, { success: false, error: access.error });
                const result = await botManager.restartBot(botId);
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Get bot status
         */
        listen('bot:status', (botId, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const bot = botManager.getBot(botId);
                respond(callback, { success: true, bot });
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Get all bots
         */
        listen('bots:list', (callback) => {
            try {
                if (!refreshSocketUser(socket)) {
                    endSession(socket);
                    return respond(callback, { success: false, error: SESSION_INVALID });
                }
                let bots = botManager.getAllBots();
                if (!isAdmin(socket.user)) {
                    bots = bots.filter((bot) => Number(bot.createdBy) === Number(socket.user.id)
                        || Number(bot.created_by) === Number(socket.user.id));
                }
                respond(callback, { success: true, bots });
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        // ==================== Guild Events ====================

        /**
         * Subscribe to guild updates
         */
        listen('guild:subscribe', ({ botId, guildId } = {}) => {
            if (!botId || !guildId) return;
            const access = guard(socket, botId);
            if (access.error) return;
            socket.join(`guild:${botId}:${guildId}`);
        });
        listen('join:music', ({ botId, guildId } = {}) => {
            const access = guard(socket, botId);
            if (access.error || !guildId) return;
            socket.join(`guild:${botId}:${guildId}`);
        });
        listen('leave:music', ({ botId, guildId } = {}) => {
            if (botId && guildId) socket.leave(`guild:${botId}:${guildId}`);
        });

        /**
         * Unsubscribe from guild updates
         */
        listen('guild:unsubscribe', ({ botId, guildId } = {}) => {
            if (!botId || !guildId) return;
            socket.leave(`guild:${botId}:${guildId}`);
        });

        /**
         * Get guild list for a bot
         */
        listen('guilds:list', (botId, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const guilds = botManager.getBotGuilds(botId);
                respond(callback, { success: true, guilds });
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        // ==================== Queue Events ====================

        /**
         * Get queue for a guild
         */
        listen('queue:get', ({ botId, guildId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const queue = botManager.getQueue(botId, guildId);
                respond(callback, { success: true, queue });
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        // ==================== Music Control Events ====================

        /**
         * Play a song
         */
        listen('music:play', async ({ botId, guildId, query, voiceChannelId, textChannelId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return respond(callback, { success: false, error: access.error });
                const result = await botManager.executeCommand(botId, guildId, 'play', {
                    query,
                    voiceChannelId,
                    textChannelId
                });
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Pause playback
         */
        listen('music:pause', async ({ botId, guildId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'pause');
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Resume playback
         */
        listen('music:resume', async ({ botId, guildId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'resume');
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Skip current track
         */
        listen('music:skip', async ({ botId, guildId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'skip');
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Stop playback
         */
        listen('music:stop', async ({ botId, guildId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'stop');
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Set volume
         */
        listen('music:volume', async ({ botId, guildId, volume } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'volume', { volume });
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Shuffle queue
         */
        listen('music:shuffle', async ({ botId, guildId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'shuffle');
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Set loop mode
         */
        listen('music:loop', async ({ botId, guildId, mode } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'loop', { mode });
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Remove track from queue
         */
        listen('music:remove', async ({ botId, guildId, index } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'remove', { index });
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Clear queue
         */
        listen('music:clear', async ({ botId, guildId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'clear');
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Move track in queue
         */
        listen('music:move', async ({ botId, guildId, from, to } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'move', { from, to });
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Jump to track
         */
        listen('music:jump', async ({ botId, guildId, index } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'jump', { index });
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        /**
         * Leave voice channel
         */
        listen('music:leave', async ({ botId, guildId } = {}, callback) => {
            try {
                const access = guard(socket, botId);
                if (access.error) return denyAccess(callback, access);
                const result = await botManager.executeCommand(botId, guildId, 'leave');
                respond(callback, result);
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        // ==================== Stats Events ====================

        /**
         * Get global stats
         */
        listen('stats:global', (callback) => {
            try {
                const stats = botManager.getGlobalStats();
                respond(callback, { success: true, stats });
            } catch (error) {
                respond(callback, { success: false, error: error.message });
            }
        });

        // ==================== Disconnect ====================

        listen('disconnect', (reason) => {
            logger.info(`Client disconnected: ${socket.user.username} (${reason})`);
        });

        listen('error', (error) => {
            logger.error(`Socket error for ${socket.user.username}:`, error);
        });
    });

    // ==================== Broadcast Helpers ====================

    /**
     * Broadcast bot update to subscribers
     */
    botManager.emitBotUpdate = (botId, event, data) => {
        const payload = { botId, event, data, status: event, timestamp: new Date().toISOString() };
        io.to(`bot:${botId}`).emit('bot:update', payload);
        io.to(`bot:${botId}`).emit('bot:status', payload);
        io.emit('bots:update', { botId, event, timestamp: payload.timestamp });
    };

    botManager.emitQueueUpdate = (botId, guildId, queue) => {
        const payload = { botId, guildId, queue, timestamp: new Date().toISOString() };
        io.to(`guild:${botId}:${guildId}`).emit('queue:update', payload);
        io.to(`guild:${botId}:${guildId}`).emit('music:queueUpdate', payload);
    };

    botManager.emitNowPlaying = (botId, guildId, track) => {
        const payload = { botId, guildId, track, timestamp: new Date().toISOString() };
        io.to(`guild:${botId}:${guildId}`).emit('nowplaying:update', payload);
        io.to(`guild:${botId}:${guildId}`).emit('music:trackStart', payload);
    };

    logger.info('Socket handlers initialized');
}

module.exports = { setupSocketHandlers };
