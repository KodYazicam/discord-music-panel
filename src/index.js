/**
 * Discord Music Panel - Main Entry Point
 * Multi-instance Discord Music Bot Management System
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./database/db');
const { BotManager } = require('./bot/BotManager');
const { setupRoutes } = require('./api/routes');
const { setupSocketHandlers } = require('./api/socket');
const { Logger } = require('./utils/Logger');

const logger = new Logger('Main');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-this') || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
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
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'discord-music-panel-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

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

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
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
