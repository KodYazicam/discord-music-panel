const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dashboard-stats-test-secret-0123456789abcdef';
process.env.JWT_SECRET = JWT_SECRET;
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
const bots = [{ id: '1', name: 'alice-bot', status: 'online', createdBy: 1, playingCount: 1 },
    { id: '2', name: 'bob-bot', status: 'offline', createdBy: 2, playingCount: 0 }];
const totals = { 1: [21, 3600, 7], 2: [999, 99999, 100] };
const guilds = [{ bot_id: '1', guild_id: 'g1', guild_name: 'Alice Guild' },
    { bot_id: '2', guild_id: 'g2', guild_name: 'Bob Guild' }];
const logs = [{ bot_id: '1', guild_id: 'g1', guild_name: 'Alice Guild', command: 'play', executed_at: '2026-11-18 09:00:00' },
    { bot_id: '2', guild_id: 'g2', guild_name: 'Bob Guild', command: 'stop', executed_at: '2026-11-18 08:00:00' }];
const ids = (list) => list.map(String);
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath, filename: dbModulePath, loaded: true,
    exports: {
        userOperations: {}, playlistOperations: {},
        settingOperations: { get: (_key, fallback) => fallback },
        botOperations: { getById: (id) => bots.find((bot) => bot.id === String(id)) || null, getAll: () => bots },
        guildOperations: { getGuildsForBots: (botIds) => guilds.filter((row) => ids(botIds).includes(row.bot_id)) },
        logOperations: {
            getRecentForBots: (botIds, limit = 10) => logs.filter((row) => ids(botIds).includes(row.bot_id)).slice(0, limit)
        },
        statisticsOperations: {
            getTotalsForBots: (botIds) => ids(botIds).reduce((acc, id) => {
                const [songs, playtime, commands] = totals[Number(id)] || [0, 0, 0];
                acc.total_songs += songs;
                acc.total_playtime += playtime;
                acc.total_commands += commands;
                return acc;
            }, { total_songs: 0, total_playtime: 0, total_commands: 0 }),
            getDailySeriesForBots: (botIds) => ids(botIds).length ? [
                { date: '2026-11-17', songs_played: 4, total_playtime: 600, commands_used: 2 },
                { date: '2026-11-18', songs_played: 6, total_playtime: 900, commands_used: 3 }
            ] : []
        }
    }
};
const { setupRoutes } = require('../src/api/routes');
let base;
let server;

before(async () => {
    const app = express();
    app.use(express.json());
    app.set('db', { prepare: () => ({ get: () => ({ ok: 1 }) }) });
    app.set('botManager', { getAllBots: () => bots, getGlobalStats: () => ({ runningBots: 1, totalBots: 2 }) });
    setupRoutes(app);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => new Promise((resolve) => server.close(resolve)));
const get = (path, user) => fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${jwt.sign(user, JWT_SECRET)}` } });

test('GET /api/stats/overview aggregates only the bots the caller can manage', async () => {
    const response = await get('/stats/overview', { id: 1, username: 'alice', role: 'user' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual([body.totalBots, body.onlineBots, body.totalGuilds, body.totalTracksPlayed], [1, 1, 1, 21]);
    assert.deepEqual([body.totalPlaytime, body.totalCommands, body.activeQueues], [3600, 7, 1]);
    assert.deepEqual(body.daily, [
        { date: '2026-11-17', songs: 4, playtime: 600, commands: 2 },
        { date: '2026-11-18', songs: 6, playtime: 900, commands: 3 }
    ]);
});

test('GET /api/stats/overview serves admins without a 404', async () => {
    const admin = await (await get('/stats/overview', { id: 9, username: 'root', role: 'admin' })).json();
    assert.deepEqual([admin.totalBots, admin.totalGuilds, admin.totalTracksPlayed], [2, 2, 1020]);
});

test('GET /api/stats/recent-activity keeps command logs inside the caller scope', async () => {
    const response = await get('/stats/recent-activity', { id: 1, username: 'alice', role: 'user' });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.activities.length, 1);
    assert.equal(body.activities[0].message, 'play in Alice Guild');
    assert.equal(body.activities[0].time, '2026-11-18 09:00:00');
});
