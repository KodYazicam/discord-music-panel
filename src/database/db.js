/**
 * Database Module - SQLite with Better-SQLite3
 * Stores bot configurations, users, playlists, and statistics
 */

const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');
const { Logger } = require('../utils/Logger');
const { encryptSecret, decryptSecret } = require('../utils/crypto');

const logger = new Logger('Database');

let db = null;

/**
 * Initialize the database with all required tables
 */
function initDatabase() {
    const dataDir = path.join(__dirname, '../../data');
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = process.env.DATABASE_PATH
        ? path.resolve(process.env.DATABASE_PATH)
        : path.join(dataDir, 'music-panel.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    logger.info('Creating database tables...');

    // Users table - Panel users (admins)
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS panel_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `);

    // Bots table - All registered bot instances
    db.exec(`
        CREATE TABLE IF NOT EXISTS bots (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            token TEXT NOT NULL,
            client_id TEXT NOT NULL,
            prefix TEXT DEFAULT '!',
            prefix_type TEXT DEFAULT 'text',
            status TEXT DEFAULT 'offline',
            activity_type TEXT DEFAULT 'LISTENING',
            activity_text TEXT DEFAULT 'music',
            auto_start INTEGER DEFAULT 0,
            volume INTEGER DEFAULT 100,
            max_queue_size INTEGER DEFAULT 500,
            default_search_engine TEXT DEFAULT 'youtube',
            announce_songs INTEGER DEFAULT 1,
            delete_bot_messages INTEGER DEFAULT 0,
            stay_in_channel INTEGER DEFAULT 0,
            dj_role_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            extra_settings TEXT DEFAULT '{}',
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);

    try {
        db.exec("ALTER TABLE bots ADD COLUMN extra_settings TEXT DEFAULT '{}'");
    } catch {
        // already migrated
    }

    // Bot guilds - Servers each bot is in
    db.exec(`
        CREATE TABLE IF NOT EXISTS bot_guilds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            guild_name TEXT,
            member_count INTEGER DEFAULT 0,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            prefix_override TEXT,
            dj_role_override TEXT,
            volume_override INTEGER,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
            UNIQUE(bot_id, guild_id)
        )
    `);

    // Playlists - Saved playlists
    db.exec(`
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            bot_id TEXT,
            guild_id TEXT,
            created_by TEXT,
            is_public INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
        )
    `);

    // Playlist tracks - Songs in playlists
    db.exec(`
        CREATE TABLE IF NOT EXISTS playlist_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            duration INTEGER DEFAULT 0,
            thumbnail TEXT,
            author TEXT,
            position INTEGER DEFAULT 0,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
        )
    `);

    // Statistics - Bot usage statistics
    db.exec(`
        CREATE TABLE IF NOT EXISTS statistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id TEXT NOT NULL,
            guild_id TEXT,
            songs_played INTEGER DEFAULT 0,
            total_playtime INTEGER DEFAULT 0,
            commands_used INTEGER DEFAULT 0,
            date DATE DEFAULT (date('now')),
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
            UNIQUE(bot_id, guild_id, date)
        )
    `);

    // Command logs - Track command usage
    db.exec(`
        CREATE TABLE IF NOT EXISTS command_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id TEXT NOT NULL,
            guild_id TEXT,
            user_id TEXT,
            command TEXT NOT NULL,
            args TEXT,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
        )
    `);

    // Favorite tracks - User favorites
    db.exec(`
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            bot_id TEXT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            duration INTEGER DEFAULT 0,
            thumbnail TEXT,
            author TEXT,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
        )
    `);

    // Bot permissions - Who can control which bot
    db.exec(`
        CREATE TABLE IF NOT EXISTS bot_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            permission_level TEXT DEFAULT 'view',
            granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(bot_id, user_id)
        )
    `);

    // Sessions - Active bot sessions
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            voice_channel_id TEXT,
            text_channel_id TEXT,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ended_at DATETIME,
            songs_played INTEGER DEFAULT 0,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
        CREATE INDEX IF NOT EXISTS idx_bot_guilds_bot ON bot_guilds(bot_id);
        CREATE INDEX IF NOT EXISTS idx_statistics_bot ON statistics(bot_id);
        CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics(date);
        CREATE INDEX IF NOT EXISTS idx_command_logs_bot ON command_logs(bot_id);
        CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    `);

    logger.info('Database initialized successfully');

    return db;
}

/**
 * Get the database instance
 */
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Close the database connection
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        logger.info('Database connection closed');
    }
}

// Bot CRUD operations
const botOperations = {
    create: (bot) => {
        const stmt = db.prepare(`
            INSERT INTO bots (id, name, token, client_id, prefix, prefix_type, auto_start, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(bot.id, bot.name, encryptSecret(bot.token), bot.clientId, bot.prefix, bot.prefixType, bot.autoStart ? 1 : 0, bot.createdBy);
    },

    getById: (id) => {
        const row = db.prepare('SELECT * FROM bots WHERE id = ?').get(id);
        if (!row) return row;
        return { ...row, token: decryptSecret(row.token) };
    },

    getAll: () => {
        return db.prepare('SELECT * FROM bots ORDER BY created_at DESC').all().map((row) => ({
            ...row,
            token: decryptSecret(row.token)
        }));
    },

    update: (id, updates) => {
        const allowed = new Set([
            'name', 'token', 'client_id', 'prefix', 'prefix_type', 'auto_start',
            'volume', 'max_queue_size', 'default_search_engine', 'announce_songs',
            'delete_bot_messages', 'stay_in_channel', 'dj_role_id', 'activity_type',
            'activity_text', 'status', 'extra_settings'
        ]);
        const keys = Object.keys(updates).filter((key) => allowed.has(key));
        if (!keys.length) return { changes: 0 };
        const payload = { ...updates };
        if (payload.token) payload.token = encryptSecret(payload.token);
        const fields = keys.map((key) => `${key} = ?`).join(', ');
        const values = [...keys.map((key) => payload[key]), id];
        const stmt = db.prepare(`UPDATE bots SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
        return stmt.run(...values);
    },

    delete: (id) => {
        return db.prepare('DELETE FROM bots WHERE id = ?').run(id);
    },

    updateStatus: (id, status) => {
        return db.prepare('UPDATE bots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    },

    getAutoStartBots: () => {
        return db.prepare('SELECT * FROM bots WHERE auto_start = 1').all().map((row) => ({
            ...row,
            token: decryptSecret(row.token)
        }));
    }
};

// Guild operations
const guildOperations = {
    upsert: (botId, guildId, guildName, memberCount) => {
        const stmt = db.prepare(`
            INSERT INTO bot_guilds (bot_id, guild_id, guild_name, member_count)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bot_id, guild_id) DO UPDATE SET
            guild_name = excluded.guild_name,
            member_count = excluded.member_count
        `);
        return stmt.run(botId, guildId, guildName, memberCount);
    },

    getByBot: (botId) => {
        return db.prepare('SELECT * FROM bot_guilds WHERE bot_id = ?').all(botId);
    },

    getSettings: (botId, guildId) => {
        return db.prepare('SELECT * FROM bot_guilds WHERE bot_id = ? AND guild_id = ?').get(botId, guildId);
    },

    updateSettings: (botId, guildId, settings) => {
        const fields = Object.keys(settings).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(settings), botId, guildId];
        const stmt = db.prepare(`UPDATE bot_guilds SET ${fields} WHERE bot_id = ? AND guild_id = ?`);
        return stmt.run(...values);
    },

    remove: (botId, guildId) => {
        return db.prepare('DELETE FROM bot_guilds WHERE bot_id = ? AND guild_id = ?').run(botId, guildId);
    }
};

// Statistics operations
const statisticsOperations = {
    increment: (botId, guildId, field, value = 1) => {
        const allowed = new Set(['songs_played', 'total_playtime', 'commands_used']);
        if (!allowed.has(field)) throw new Error(`Invalid statistics field: ${field}`);
        const stmt = db.prepare(`
            INSERT INTO statistics (bot_id, guild_id, ${field})
            VALUES (?, ?, ?)
            ON CONFLICT(bot_id, guild_id, date) DO UPDATE SET
            ${field} = ${field} + ?
        `);
        return stmt.run(botId, guildId, value, value);
    },

    getByBot: (botId, startDate, endDate) => {
        return db.prepare(`
            SELECT * FROM statistics 
            WHERE bot_id = ? AND date BETWEEN ? AND ?
            ORDER BY date DESC
        `).all(botId, startDate, endDate);
    },

    getTotal: (botId) => {
        return db.prepare(`
            SELECT 
                SUM(songs_played) as total_songs,
                SUM(total_playtime) as total_playtime,
                SUM(commands_used) as total_commands
            FROM statistics WHERE bot_id = ?
        `).get(botId);
    },

    getGlobalStats: () => {
        return db.prepare(`
            SELECT 
                COUNT(DISTINCT bot_id) as total_bots,
                SUM(songs_played) as total_songs,
                SUM(total_playtime) as total_playtime,
                SUM(commands_used) as total_commands
            FROM statistics
        `).get();
    }
};

// Playlist operations
const playlistOperations = {
    create: (playlist) => {
        const stmt = db.prepare(`
            INSERT INTO playlists (name, description, bot_id, guild_id, created_by, is_public)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(playlist.name, playlist.description, playlist.botId, playlist.guildId, playlist.createdBy, playlist.isPublic ? 1 : 0);
        return result.lastInsertRowid;
    },

    getById: (id) => {
        return db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    },

    getByUser: (userId) => {
        return db.prepare('SELECT * FROM playlists WHERE created_by = ? ORDER BY created_at DESC').all(userId);
    },

    getPublic: () => {
        return db.prepare('SELECT * FROM playlists WHERE is_public = 1 ORDER BY created_at DESC').all();
    },

    addTrack: (playlistId, track) => {
        const position = db.prepare('SELECT MAX(position) as max FROM playlist_tracks WHERE playlist_id = ?').get(playlistId);
        const stmt = db.prepare(`
            INSERT INTO playlist_tracks (playlist_id, title, url, duration, thumbnail, author, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(playlistId, track.title, track.url, track.duration, track.thumbnail, track.author, (position?.max || 0) + 1);
    },

    getTracks: (playlistId) => {
        return db.prepare('SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position').all(playlistId);
    },

    removeTrack: (trackId) => {
        return db.prepare('DELETE FROM playlist_tracks WHERE id = ?').run(trackId);
    },

    delete: (id) => {
        return db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
    }
};

// Command log operations
const logOperations = {
    add: (botId, guildId, userId, command, args) => {
        const stmt = db.prepare(`
            INSERT INTO command_logs (bot_id, guild_id, user_id, command, args)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(botId, guildId, userId, command, JSON.stringify(args));
    },

    getRecent: (botId, limit = 100) => {
        return db.prepare(`
            SELECT * FROM command_logs 
            WHERE bot_id = ? 
            ORDER BY executed_at DESC 
            LIMIT ?
        `).all(botId, limit);
    },

    getByGuild: (botId, guildId, limit = 50) => {
        return db.prepare(`
            SELECT * FROM command_logs 
            WHERE bot_id = ? AND guild_id = ?
            ORDER BY executed_at DESC 
            LIMIT ?
        `).all(botId, guildId, limit);
    }
};

// User operations
const userOperations = {
    create: (username, password, email, role = 'user') => {
        const stmt = db.prepare(`
            INSERT INTO users (username, password, email, role)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(username, password, email, role);
        return result.lastInsertRowid;
    },

    getByUsername: (username) => {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    getById: (id) => {
        return db.prepare('SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?').get(id);
    },

    getAuthById: (id) => {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },

    updateProfile: (id, username, email) => {
        return db.prepare('UPDATE users SET username = ?, email = ? WHERE id = ?').run(username, email, id);
    },

    updatePassword: (id, password) => {
        return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id);
    },

    updateLastLogin: (id) => {
        return db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    },

    getAll: () => {
        return db.prepare('SELECT id, username, email, role, created_at, last_login FROM users').all();
    },

    count: () => {
        return db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    },

    setRole: (id, role) => {
        return db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    },

    delete: (id) => {
        return db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
};

const settingOperations = {
    get: (key, fallback = null) => {
        const row = db.prepare('SELECT value FROM panel_settings WHERE key = ?').get(key);
        return row ? row.value : fallback;
    },
    set: (key, value) => {
        db.prepare(`
            INSERT INTO panel_settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(key, value);
    }
};

module.exports = {
    initDatabase,
    getDatabase,
    closeDatabase,
    botOperations,
    guildOperations,
    statisticsOperations,
    playlistOperations,
    logOperations,
    userOperations,
    settingOperations
};
