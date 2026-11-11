/**
 * Discord Music Panel - Main Entry Point
 * Multi-instance Discord Music Bot Management System
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./database/db');
const { BotManager } = require('./bot/BotManager');
const { setupRoutes } = require('./api/routes');
const { setupSocketHandlers } = require('./api/socket');
const { checkYtDlpHealth } = require('./bot/ytdlp');
const { Logger } = require('./utils/Logger');

const logger = new Logger('Main');

function isWeakSecret(value, placeholders) {
    if (!value) return true;
    return placeholders.some((item) => value === item || value.includes(item));
}

if (isWeakSecret(process.env.JWT_SECRET, ['change-this', 'your-super-secret-jwt-key-change-this-in-production', 'discord-music-panel-jwt-secret'])) {
    if (process.env.NODE_ENV === 'production') {
        logger.error('Set a real JWT_SECRET before starting in production.');
        process.exit(1);
    }
    logger.warn('JWT_SECRET is using a default value. Set a strong secret in .env.');
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
app.use(cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

const staticLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, try again later' }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// Initialize database
logger.info('Initializing database...');
const db = initDatabase();

// Initialize Bot Manager
logger.info('Initializing Bot Manager...');
const botManager = new BotManager(db, io);

// Make botManager available to routes
app.set('botManager', botManager);
app.set('db', db);
app.set('io', io);

// Setup API routes
setupRoutes(app);

// Setup Socket.io handlers
setupSocketHandlers(io, botManager, db);

// Report yt-dlp availability once at startup without blocking the server.
checkYtDlpHealth().then((health) => {
    if (health.available) {
        logger.info(`yt-dlp ${health.version} is available`);
    } else {
        logger.warn(`yt-dlp is unavailable: ${health.error}`);
    }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.get('/{*splat}', staticLimiter, (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return next();
        }
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, async () => {
    logger.info(`🎵 Discord Music Panel Server running on port ${PORT}`);
    logger.info(`📊 Dashboard: http://localhost:${PORT}`);
    logger.info(`🔌 API: http://localhost:${PORT}/api`);
    
    // Auto-start bots that are marked as auto-start
    try {
        await botManager.autoStartBots();
    } catch (error) {
        logger.error('Error auto-starting bots:', error);
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    await botManager.stopAllBots();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully...');
    await botManager.stopAllBots();
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = { app, io, botManager };
