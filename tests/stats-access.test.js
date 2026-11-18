const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'stats-access-test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

const bots = new Map([
    [1, { id: 1, name: 'alice-bot', created_by: 1 }]
]);

const seededUsers = new Map([
    [1, { id: 1, username: 'alice', role: 'user' }],
    [2, { id: 2, username: 'bob', role: 'user' }],
    [99, { id: 99, username: 'admin', role: 'admin' }]
]);

const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        userOperations: {
            getById: (id) => seededUsers.get(Number(id)) || null
        },
        botOperations: {
            getById: (id) => bots.get(Number(id)) || null,
            getAll: () => [...bots.values()]
        },
        statisticsOperations: {
            getByBot: (botId) => [{ date: '2026-11-14', botId: Number(botId), songs_played: 42 }],
            getTotal: (botId) => ({ botId: Number(botId), songs_played: 1337 })
        },
        playlistOperations: {},
        settingOperations: { get: (_key, fallback) => fallback },
        guildOperations: {}
    }
};

const { setupRoutes } = require('../src/api/routes');

async function startServer(t) {
    const app = express();
    app.use(express.json());
    app.set('db', { prepare: () => ({ get: () => ({ ok: 1 }) }) });
    setupRoutes(app);

    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));

    return `http://127.0.0.1:${server.address().port}`;
}

function tokenFor(user) {
    return jwt.sign(user, JWT_SECRET);
}

function getStats(base, botId, user) {
    return fetch(`${base}/api/stats/${botId}`, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${tokenFor(user)}`
        }
    });
}

test('GET /api/stats/:botId rejects a user who does not own the bot', async (t) => {
    const base = await startServer(t);

    const response = await getStats(base, 1, { id: 2, username: 'bob', role: 'user' });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { success: false, error: 'Forbidden' });
});

test('GET /api/stats/:botId returns stats to the bot owner', async (t) => {
    const base = await startServer(t);

    const response = await getStats(base, 1, { id: 1, username: 'alice', role: 'user' });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.stats[0].songs_played, 42);
    assert.equal(body.total.songs_played, 1337);
});

test('GET /api/stats/:botId allows admins and returns 404 for unknown bots', async (t) => {
    const base = await startServer(t);

    const adminResponse = await getStats(base, 1, { id: 99, username: 'admin', role: 'admin' });
    assert.equal(adminResponse.status, 200);

    const missing = await getStats(base, 999, { id: 2, username: 'bob', role: 'user' });
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { success: false, error: 'Bot not found' });
});
