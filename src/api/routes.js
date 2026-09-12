/**
 * API Routes - REST API endpoints for the panel
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../utils/Logger');
const { userOperations, botOperations, statisticsOperations, playlistOperations, guildOperations, settingOperations } = require('../database/db');

const logger = new Logger('API');

/**
 * Setup all API routes
 */
function setupRoutes(app) {
    const router = express.Router();

    // JWT Secret
    const JWT_SECRET = process.env.JWT_SECRET || 'discord-music-panel-jwt-secret';

    // Authentication middleware
    const authMiddleware = (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }
    };

    const adminMiddleware = (req, res, next) => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Admin only' });
        }
        next();
    };

    const registrationOpen = () => {
        const users = userOperations.count();
        if (users === 0) return true;
        return settingOperations.get('registration_open', '0') === '1';
    };

    // ==================== Auth Routes ====================

    /**
     * POST /api/auth/register - Register new user
     */
    router.post('/auth/register', async (req, res) => {
        try {
            const { username, password, email } = req.body;

            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Username and password required' });
            }

            if (!registrationOpen()) {
                return res.status(403).json({
                    success: false,
                    error: 'Registration is closed. Ask an admin to open it from Settings → Users.'
                });
            }

            const existing = userOperations.getByUsername(username);
            if (existing) {
                return res.status(400).json({ success: false, error: 'Username already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const users = userOperations.getAll();
            const role = users.length === 0 ? 'admin' : 'user';
            if (users.length === 0) {
                settingOperations.set('registration_open', '0');
            }
            
            const userId = userOperations.create(username, hashedPassword, email, role);

            // Generate token
            const token = jwt.sign({ id: userId, username, role }, JWT_SECRET, { expiresIn: '24h' });

            logger.info(`New user registered: ${username}`);

            res.json({
                success: true,
                token,
                user: { id: userId, username, email, role }
            });
        } catch (error) {
            logger.error('Registration error:', error);
            res.status(500).json({ success: false, error: 'Registration failed' });
        }
    });

    /**
     * POST /api/auth/login - Login user
     */
    router.post('/auth/login', async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Username and password required' });
            }

            const user = userOperations.getByUsername(username);
            if (!user) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }

            // Update last login
            userOperations.updateLastLogin(user.id);

            // Generate token
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            logger.info(`User logged in: ${username}`);

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({ success: false, error: 'Login failed' });
        }
    });

    /**
     * GET /api/auth/me - Get current user
     */
    router.get('/auth/me', authMiddleware, (req, res) => {
        const user = userOperations.getById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, user });
    });

    router.get('/auth/registration', (_req, res) => {
        res.json({
            success: true,
            open: registrationOpen(),
            needsSetup: userOperations.count() === 0
        });
    });

    router.get('/users', authMiddleware, adminMiddleware, (_req, res) => {
        res.json({
            success: true,
            users: userOperations.getAll(),
            registrationOpen: settingOperations.get('registration_open', '0') === '1'
        });
    });

    router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
        try {
            const { username, password, email, role } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Username and password required' });
            }
            if (userOperations.getByUsername(username)) {
                return res.status(400).json({ success: false, error: 'Username already exists' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const id = userOperations.create(username, hashedPassword, email || '', role === 'admin' ? 'admin' : 'user');
            res.json({ success: true, user: userOperations.getById(id) });
        } catch (error) {
            logger.error('Create user error:', error);
            res.status(500).json({ success: false, error: 'Failed to create user' });
        }
    });

    router.patch('/users/:id', authMiddleware, adminMiddleware, (req, res) => {
        const id = Number(req.params.id);
        const user = userOperations.getById(id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        if (req.body.role) {
            if (user.role === 'admin' && req.body.role !== 'admin') {
                const admins = userOperations.getAll().filter((u) => u.role === 'admin');
                if (admins.length <= 1) {
                    return res.status(400).json({ success: false, error: 'Cannot demote the last admin' });
                }
            }
            userOperations.setRole(id, req.body.role === 'admin' ? 'admin' : 'user');
        }
        res.json({ success: true, user: userOperations.getById(id) });
    });

    router.delete('/users/:id', authMiddleware, adminMiddleware, (req, res) => {
        const id = Number(req.params.id);
        if (id === req.user.id) {
            return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
        }
        const user = userOperations.getById(id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        if (user.role === 'admin') {
            const admins = userOperations.getAll().filter((u) => u.role === 'admin');
            if (admins.length <= 1) {
                return res.status(400).json({ success: false, error: 'Cannot delete the last admin' });
            }
        }
        userOperations.delete(id);
        res.json({ success: true });
    });

    router.post('/settings/registration', authMiddleware, adminMiddleware, (req, res) => {
        const open = Boolean(req.body.open);
        settingOperations.set('registration_open', open ? '1' : '0');
        res.json({ success: true, registrationOpen: open });
    });

    // ==================== Bot Routes ====================

    /**
     * GET /api/bots - Get all bots
     */
    router.get('/bots', authMiddleware, (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const bots = botManager.getAllBots();
            res.json({ success: true, bots });
        } catch (error) {
            logger.error('Error getting bots:', error);
            res.status(500).json({ success: false, error: 'Failed to get bots' });
        }
    });

    /**
     * GET /api/bots/:id - Get specific bot
     */
    router.get('/bots/:id', authMiddleware, (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const bot = botManager.getBot(req.params.id);
            
            if (!bot) {
                return res.status(404).json({ success: false, error: 'Bot not found' });
            }
            
            res.json({ success: true, bot });
        } catch (error) {
            logger.error('Error getting bot:', error);
            res.status(500).json({ success: false, error: 'Failed to get bot' });
        }
    });

    /**
     * POST /api/bots - Create new bot
     */
    router.post('/bots', authMiddleware, async (req, res) => {
        try {
            const { name, token, clientId, prefix, prefixType, autoStart } = req.body;

            if (!name || !token) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Name and token are required' 
                });
            }

            let resolvedClientId = clientId;
            if (!resolvedClientId) {
                try {
                    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/applications/@me', {
                        headers: { Authorization: `Bot ${token}` }
                    });
                    if (tokenRes.ok) {
                        const app = await tokenRes.json();
                        resolvedClientId = app.id;
                    }
                } catch (error) {
                    logger.warn('Could not derive clientId from token:', error.message);
                }
            }

            if (!resolvedClientId) {
                return res.status(400).json({
                    success: false,
                    error: 'clientId is required (or the bot token must be valid so it can be derived)'
                });
            }

            const botManager = req.app.get('botManager');
            const result = await botManager.createBot({
                name,
                token,
                clientId: resolvedClientId,
                prefix: prefix || '!',
                prefixType: prefixType || 'text',
                autoStart: autoStart || false,
                createdBy: req.user.id
            });

            res.json(result);
        } catch (error) {
            logger.error('Error creating bot:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/bots/:id - Update bot
     */
    router.put('/bots/:id', authMiddleware, async (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const result = await botManager.updateBot(req.params.id, req.body);
            res.json(result);
        } catch (error) {
            logger.error('Error updating bot:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/bots/:id - Delete bot
     */
    router.delete('/bots/:id', authMiddleware, async (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const result = await botManager.deleteBot(req.params.id);
            res.json(result);
        } catch (error) {
            logger.error('Error deleting bot:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/bots/:id/start - Start bot
     */
    router.post('/bots/:id/start', authMiddleware, async (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const result = await botManager.startBot(req.params.id);
            res.json(result);
        } catch (error) {
            logger.error('Error starting bot:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/bots/:id/stop - Stop bot
     */
    router.post('/bots/:id/stop', authMiddleware, async (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const result = await botManager.stopBot(req.params.id);
            res.json(result);
        } catch (error) {
            logger.error('Error stopping bot:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/bots/:id/restart - Restart bot
     */
    router.post('/bots/:id/restart', authMiddleware, async (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const result = await botManager.restartBot(req.params.id);
            res.json(result);
        } catch (error) {
            logger.error('Error restarting bot:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/bots/:id/guilds - Get bot guilds
     */
    router.get('/bots/:id/guilds', authMiddleware, (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const guilds = botManager.getBotGuilds(req.params.id);
            res.json({ success: true, guilds });
        } catch (error) {
            logger.error('Error getting guilds:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/bots/:id/guilds/:guildId/queue - Get queue for guild
     */
    router.get('/bots/:id/guilds/:guildId/queue', authMiddleware, (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const queue = botManager.getQueue(req.params.id, req.params.guildId);
            res.json({ success: true, queue });
        } catch (error) {
            logger.error('Error getting queue:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/bots/:id/guilds/:guildId/command - Execute command
     */
    router.post('/bots/:id/guilds/:guildId/command', authMiddleware, async (req, res) => {
        try {
            const { command, args } = req.body;
            const botManager = req.app.get('botManager');
            const result = await botManager.executeCommand(
                req.params.id, 
                req.params.guildId, 
                command, 
                args
            );
            res.json(result);
        } catch (error) {
            logger.error('Error executing command:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==================== Statistics Routes ====================

    /**
     * GET /api/stats - Get global statistics
     */
    router.get('/stats', authMiddleware, (req, res) => {
        try {
            const botManager = req.app.get('botManager');
            const stats = botManager.getGlobalStats();
            const dbStats = statisticsOperations.getGlobalStats();
            
            res.json({
                success: true,
                stats: {
                    ...stats,
                    ...dbStats
                }
            });
        } catch (error) {
            logger.error('Error getting stats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/stats/:botId - Get bot statistics
     */
    router.get('/stats/:botId', authMiddleware, (req, res) => {
        try {
            const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
            
            const stats = statisticsOperations.getByBot(req.params.botId, startDate, endDate);
            const total = statisticsOperations.getTotal(req.params.botId);
            
            res.json({
                success: true,
                stats,
                total
            });
        } catch (error) {
            logger.error('Error getting bot stats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==================== Playlist Routes ====================

    /**
     * GET /api/playlists - Get user playlists
     */
    router.get('/playlists', authMiddleware, (req, res) => {
        try {
            const playlists = playlistOperations.getByUser(req.user.id);
            res.json({ success: true, playlists });
        } catch (error) {
            logger.error('Error getting playlists:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/playlists/public - Get public playlists
     */
    router.get('/playlists/public', authMiddleware, (req, res) => {
        try {
            const playlists = playlistOperations.getPublic();
            res.json({ success: true, playlists });
        } catch (error) {
            logger.error('Error getting public playlists:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/playlists - Create playlist
     */
    router.post('/playlists', authMiddleware, (req, res) => {
        try {
            const { name, description, isPublic } = req.body;
            
            if (!name) {
                return res.status(400).json({ success: false, error: 'Name is required' });
            }

            const playlistId = playlistOperations.create({
                name,
                description,
                createdBy: req.user.id,
                isPublic: isPublic || false
            });

            res.json({ success: true, playlistId });
        } catch (error) {
            logger.error('Error creating playlist:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/playlists/:id - Get playlist with tracks
     */
    router.get('/playlists/:id', authMiddleware, (req, res) => {
        try {
            const playlist = playlistOperations.getById(req.params.id);
            if (!playlist) {
                return res.status(404).json({ success: false, error: 'Playlist not found' });
            }

            const tracks = playlistOperations.getTracks(req.params.id);
            res.json({ success: true, playlist, tracks });
        } catch (error) {
            logger.error('Error getting playlist:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/playlists/:id/tracks - Add track to playlist
     */
    router.post('/playlists/:id/tracks', authMiddleware, (req, res) => {
        try {
            const { title, url, duration, thumbnail, author } = req.body;
            
            if (!title || !url) {
                return res.status(400).json({ success: false, error: 'Title and URL are required' });
            }

            playlistOperations.addTrack(req.params.id, { title, url, duration, thumbnail, author });
            res.json({ success: true, message: 'Track added' });
        } catch (error) {
            logger.error('Error adding track:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/playlists/:id/tracks/:trackId - Remove track from playlist
     */
    router.delete('/playlists/:id/tracks/:trackId', authMiddleware, (req, res) => {
        try {
            playlistOperations.removeTrack(req.params.trackId);
            res.json({ success: true, message: 'Track removed' });
        } catch (error) {
            logger.error('Error removing track:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/playlists/:id - Delete playlist
     */
    router.delete('/playlists/:id', authMiddleware, (req, res) => {
        try {
            playlistOperations.delete(req.params.id);
            res.json({ success: true, message: 'Playlist deleted' });
        } catch (error) {
            logger.error('Error deleting playlist:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==================== Health Check ====================

    /**
     * GET /api/health - Health check
     */
    router.get('/health', (req, res) => {
        const botManager = req.app.get('botManager');
        res.json({
            success: true,
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            bots: {
                total: botOperations.getAll().length,
                running: botManager.getRunningCount()
            }
        });
    });

    // Mount router
    app.use('/api', router);

    logger.info('API routes initialized');
}

module.exports = { setupRoutes };
