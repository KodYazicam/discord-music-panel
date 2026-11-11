const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Stub the database module before routes load. Route setup only needs these
// operation objects to exist; the status tests never touch SQLite.
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        userOperations: {},
        botOperations: {
            getById: () => null,
            getAll: () => []
        },
        statisticsOperations: {},
        playlistOperations: {},
        settingOperations: {}
    }
};

const { setupRoutes } = require('../src/api/routes');

function healthyDb() {
    return {
        prepare(sql) {
            assert.equal(sql, 'SELECT 1');
            return { get: () => ({ ok: 1 }) };
        }
    };
}

function brokenDb() {
    return {
        prepare() {
            throw new Error('database is locked');
        }
    };
}

function sampleBotManager() {
    return {
        getGlobalStats: () => ({
            runningBots: 1,
            totalBots: 2,
            totalGuilds: 3,
            totalPlaying: 1,
            totalQueued: 4,
            totalUsers: 50
        }),
        getAllBots: () => [
            {
                id: 'bot-1',
                name: 'Music One',
                status: 'online',
                guildCount: 3,
                playingCount: 1,
                totalQueuedSongs: 4,
                uptime: 1234,
                token: 'super-secret-token',
                clientId: '1234567890',
                prefix: '!',
                guilds: [{ id: 'guild-secret', name: 'Secret Guild' }],
                settings: { djRoleId: 'secret-role' }
            },
            {
                id: 'bot-2',
                name: 'Offline Bot',
                status: 'offline'
            }
        ]
    };
}

async function startServer(t, { db = healthyDb(), botManager = sampleBotManager() } = {}) {
    const app = express();
    app.use(express.json());
    app.set('db', db);
    app.set('botManager', botManager);
    setupRoutes(app);

    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));

    return `http://127.0.0.1:${server.address().port}`;
}

test('GET /api/health returns 200 when the database probe succeeds', async (t) => {
    const base = await startServer(t);
    const response = await fetch(`${base}/api/health`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { success: true, status: 'healthy' });
});

test('GET /api/health returns 503 when the database probe throws', async (t) => {
    const base = await startServer(t, { db: brokenDb() });
    const response = await fetch(`${base}/api/health`);

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { success: false, status: 'unhealthy' });
});

test('GET /api/health returns 503 when the database handle is missing', async (t) => {
    const base = await startServer(t, { db: null });
    const response = await fetch(`${base}/api/health`);

    assert.equal(response.status, 503);
    assert.equal((await response.json()).status, 'unhealthy');
});

test('GET /api/status is public and returns aggregate and allowlisted bot data', async (t) => {
    const base = await startServer(t);
    const response = await fetch(`${base}/api/status`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');

    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.version, 'string');
    assert.equal(typeof body.uptimeSeconds, 'number');
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    assert.equal(body.runningBots, 1);
    assert.equal(body.totalBots, 2);
    assert.equal(body.totalGuilds, 3);
    assert.equal(body.totalPlaying, 1);
    assert.equal(body.totalQueued, 4);
    assert.equal(body.totalUsers, 50);

    assert.equal(body.bots.length, 2);
    assert.deepEqual(body.bots[0], {
        id: 'bot-1',
        name: 'Music One',
        status: 'online',
        guildCount: 3,
        playingCount: 1,
        totalQueuedSongs: 4,
        uptime: 1234
    });
    assert.deepEqual(body.bots[1], {
        id: 'bot-2',
        name: 'Offline Bot',
        status: 'offline',
        guildCount: 0,
        playingCount: 0,
        totalQueuedSongs: 0,
        uptime: 0
    });
});

test('GET /api/status never leaks tokens, client IDs, guilds, or settings', async (t) => {
    const base = await startServer(t);
    const response = await fetch(`${base}/api/status`);
    const raw = await response.text();

    for (const secret of ['super-secret-token', '1234567890', 'guild-secret', 'Secret Guild', 'secret-role']) {
        assert.equal(raw.includes(secret), false, `response leaked ${secret}`);
    }
});

test('GET /api/status degrades to zeros without a bot manager', async (t) => {
    const base = await startServer(t, { botManager: null });
    const response = await fetch(`${base}/api/status`);

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.runningBots, 0);
    assert.equal(body.totalBots, 0);
    assert.deepEqual(body.bots, []);
});

test('GET /api/status returns 503 when the bot manager throws', async (t) => {
    const base = await startServer(t, {
        botManager: {
            getGlobalStats: () => {
                throw new Error('stats unavailable');
            },
            getAllBots: () => []
        }
    });
    const response = await fetch(`${base}/api/status`);

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { success: false, status: 'unavailable' });
});
