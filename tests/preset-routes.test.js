const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'preset-route-test-secret';

const store = new Map([
    ['bot-1:guild-1', '{}']
]);
const applied = [];

const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        userOperations: {},
        botOperations: {
            getById: (id) => {
                if (id === 'bot-1') return { id, name: 'Bot One', created_by: 1 };
                if (id === 'bot-2') return { id, name: 'Bot Two', created_by: 2 };
                return null;
            },
            getAll: () => []
        },
        statisticsOperations: {},
        playlistOperations: {},
        settingOperations: {},
        guildOperations: {
            getPresets: (botId, guildId) => {
                const key = `${botId}:${guildId}`;
                if (!store.has(key)) return null;
                return JSON.parse(store.get(key));
            },
            updatePresets: (botId, guildId, presets) => {
                store.set(`${botId}:${guildId}`, JSON.stringify(presets));
                return { changes: 1 };
            }
        }
    }
};

const { setupRoutes } = require('../src/api/routes');

const ownerToken = jwt.sign({ id: 1, username: 'owner', role: 'admin' }, process.env.JWT_SECRET);
const otherToken = jwt.sign({ id: 3, username: 'other', role: 'user' }, process.env.JWT_SECRET);

async function startServer(t) {
    const app = express();
    app.use(express.json());
    app.set('botManager', {
        applyGuildPresets: (botId, guildId, presets) => {
            applied.push({ botId, guildId, presets });
            return true;
        }
    });
    setupRoutes(app);

    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));

    return `http://127.0.0.1:${server.address().port}`;
}

function request(base, path, { token, method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    return fetch(`${base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

test('GET presets requires authentication', async (t) => {
    const base = await startServer(t);
    const response = await request(base, '/api/bots/bot-1/guilds/guild-1/presets');

    assert.equal(response.status, 401);
});

test('GET presets returns the saved object for the bot owner', async (t) => {
    store.set('bot-1:guild-1', JSON.stringify({ volume: 55 }));
    const base = await startServer(t);
    const response = await request(base, '/api/bots/bot-1/guilds/guild-1/presets', { token: ownerToken });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, presets: { volume: 55 } });
});

test('GET presets hides guilds from users without bot access', async (t) => {
    const base = await startServer(t);
    const response = await request(base, '/api/bots/bot-1/guilds/guild-1/presets', { token: otherToken });

    assert.equal(response.status, 403);
});

test('GET presets returns 404 for an unknown guild', async (t) => {
    const base = await startServer(t);
    const response = await request(base, '/api/bots/bot-1/guilds/missing/presets', { token: ownerToken });

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, 'Guild not found');
});

test('PUT presets validates, persists, and applies to the active queue', async (t) => {
    applied.length = 0;
    store.set('bot-1:guild-1', '{}');
    const base = await startServer(t);
    const presets = {
        volume: 60,
        maxQueueSize: 50,
        defaultLoopMode: 'queue',
        announceSongs: false,
        stayInChannel: true
    };

    const response = await request(base, '/api/bots/bot-1/guilds/guild-1/presets', {
        token: ownerToken,
        method: 'PUT',
        body: presets
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, { success: true, presets, appliedToActiveQueue: true });
    assert.deepEqual(JSON.parse(store.get('bot-1:guild-1')), presets);
    assert.deepEqual(applied, [{ botId: 'bot-1', guildId: 'guild-1', presets }]);
});

test('PUT presets persists only allowlisted keys', async (t) => {
    store.set('bot-1:guild-1', '{}');
    const base = await startServer(t);

    const response = await request(base, '/api/bots/bot-1/guilds/guild-1/presets', {
        token: ownerToken,
        method: 'PUT',
        body: { volume: 10 }
    });

    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(store.get('bot-1:guild-1')), { volume: 10 });
});

test('PUT presets rejects invalid values with 400', async (t) => {
    const base = await startServer(t);
    const invalidBodies = [
        { volume: 250 },
        { volume: 'loud' },
        { maxQueueSize: 0 },
        { defaultLoopMode: 'forever' },
        { announceSongs: 'yes' },
        { stayInChannel: 1 },
        { volume: 50, token: 'secret' }
    ];

    for (const body of invalidBodies) {
        const response = await request(base, '/api/bots/bot-1/guilds/guild-1/presets', {
            token: ownerToken,
            method: 'PUT',
            body
        });

        assert.equal(response.status, 400, JSON.stringify(body));
        assert.equal((await response.json()).success, false);
    }
});

test('PUT presets rejects a non-object body', async (t) => {
    const base = await startServer(t);
    const response = await request(base, '/api/bots/bot-1/guilds/guild-1/presets', {
        token: ownerToken,
        method: 'PUT',
        body: ['volume']
    });

    assert.equal(response.status, 400);
});

test('PUT presets returns 404 for an unknown guild', async (t) => {
    const base = await startServer(t);
    const response = await request(base, '/api/bots/bot-1/guilds/missing/presets', {
        token: ownerToken,
        method: 'PUT',
        body: { volume: 20 }
    });

    assert.equal(response.status, 404);
});

test('PUT presets reports when no active queue was updated', async (t) => {
    store.set('bot-2:guild-2', '{}');
    const app = express();
    app.use(express.json());
    app.set('botManager', { applyGuildPresets: () => false });
    setupRoutes(app);
    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));

    const response = await request(`http://127.0.0.1:${server.address().port}`, '/api/bots/bot-2/guilds/guild-2/presets', {
        token: ownerToken,
        method: 'PUT',
        body: { volume: 20 }
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).appliedToActiveQueue, false);
});
