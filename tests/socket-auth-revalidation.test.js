const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'socket-auth-revalidation-test-secret';

const users = new Map();
const bots = new Map([
    [1, { id: 1, name: 'alice-bot', created_by: 8 }],
    [2, { id: 2, name: 'bob-bot', created_by: 9 }]
]);

const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        userOperations: {
            getById: (id) => users.get(Number(id))
        },
        botOperations: {
            getById: (id) => bots.get(Number(id)) || null,
            getAll: () => [...bots.values()]
        },
        statisticsOperations: {},
        playlistOperations: {},
        settingOperations: { get: (_key, fallback = null) => fallback },
        guildOperations: {}
    }
};

const { setupSocketHandlers } = require('../src/api/socket');

function captureAuthMiddleware() {
    let middleware;
    const io = {
        use: (fn) => {
            middleware = fn;
        },
        on: () => {},
        to: () => ({ emit: () => {} })
    };
    setupSocketHandlers(io, {}, {});
    assert.equal(typeof middleware, 'function');
    return middleware;
}

function authenticate(middleware, token) {
    return new Promise((resolve) => {
        const socket = { handshake: { auth: token === undefined ? {} : { token } } };
        middleware(socket, (error) => resolve({ error, socket }));
    });
}

test('socket auth rejects a deleted account even with a valid JWT', async () => {
    users.clear();
    const middleware = captureAuthMiddleware();
    const token = jwt.sign({ id: 7, username: 'gone', role: 'admin' }, process.env.JWT_SECRET);

    const { error, socket } = await authenticate(middleware, token);

    assert.ok(error instanceof Error);
    assert.equal(error.message, 'Invalid token');
    assert.equal(socket.user, undefined);
});

test('socket auth uses the current database role instead of the token claim', async () => {
    users.clear();
    users.set(8, { id: 8, username: 'alice', role: 'user' });
    const middleware = captureAuthMiddleware();
    const token = jwt.sign({ id: 8, username: 'alice', role: 'admin' }, process.env.JWT_SECRET);

    const { error, socket } = await authenticate(middleware, token);

    assert.equal(error, undefined);
    assert.equal(socket.user.id, 8);
    assert.equal(socket.user.username, 'alice');
    assert.equal(socket.user.role, 'user');
});

test('socket auth still rejects a missing token', async () => {
    users.clear();
    const middleware = captureAuthMiddleware();

    const { error } = await authenticate(middleware, undefined);

    assert.ok(error instanceof Error);
    assert.equal(error.message, 'Authentication required');
});

function createBotManager() {
    const calls = { start: [], execute: [] };
    return {
        calls,
        getAllBots: () => [...bots.values()].map((bot) => ({
            id: bot.id,
            name: bot.name,
            createdBy: bot.created_by,
            created_by: bot.created_by
        })),
        getBot: (botId) => bots.get(Number(botId)) || null,
        startBot: async (botId) => {
            calls.start.push(Number(botId));
            return { success: true };
        },
        executeCommand: async (botId, guildId, command) => {
            calls.execute.push({ botId, guildId, command });
            return { success: true };
        }
    };
}

/**
 * Open a socket through the real `connection` handler while skipping the
 * handshake. This models a connection that was authenticated earlier and whose
 * `socket.user` snapshot may now be stale.
 */
function openSocket(user, botManager = createBotManager()) {
    let connection;
    const io = {
        use() {},
        on(event, handler) {
            if (event === 'connection') connection = handler;
        },
        to: () => ({ emit() {} }),
        emit() {}
    };
    setupSocketHandlers(io, botManager, {});

    const handlers = new Map();
    const disconnects = [];
    const socket = {
        id: `socket-${user.id}`,
        user,
        handshake: { auth: {} },
        on(event, handler) {
            handlers.set(event, handler);
        },
        join() {},
        leave() {},
        disconnect(close) {
            disconnects.push(close);
        }
    };
    connection(socket);

    const emit = (event, ...args) => new Promise((resolve, reject) => {
        const handler = handlers.get(event);
        if (typeof handler !== 'function') {
            reject(new Error(`missing handler for ${event}`));
            return;
        }
        handler(...args, resolve);
    });
    const flush = () => new Promise((resolve) => setImmediate(resolve));

    return { socket, emit, flush, botManager, disconnects };
}

test('an already-open socket loses admin scope when the account is demoted', async () => {
    users.clear();
    users.set(8, { id: 8, username: 'alice', role: 'admin' });
    const opened = openSocket({ id: 8, username: 'alice', role: 'admin' });

    assert.equal((await opened.emit('bots:list')).bots.length, 2, 'the admin snapshot sees every bot');

    users.set(8, { id: 8, username: 'alice', role: 'user' });

    const list = await opened.emit('bots:list');
    assert.deepEqual(list.bots.map((bot) => bot.name), ['alice-bot']);
    assert.equal(opened.socket.user.role, 'user', 'the socket must hold the database role');

    assert.deepEqual(
        await opened.emit('bot:start', 2),
        { success: false, error: 'Forbidden' },
        'a demoted admin may not start another owner\'s bot'
    );
    assert.deepEqual(
        await opened.emit('music:play', { botId: 2, guildId: 'g1', query: 'never gonna give you up' }),
        { success: false, error: 'Forbidden' },
        'a demoted admin may not control another owner\'s bot'
    );
    assert.deepEqual(opened.botManager.calls.start, [], 'no lifecycle action may reach the bot');
    assert.deepEqual(opened.botManager.calls.execute, [], 'no command may reach the bot');
});

test('an already-open socket is disconnected once the account is deleted', async () => {
    users.clear();
    users.set(8, { id: 8, username: 'alice', role: 'admin' });
    const opened = openSocket({ id: 8, username: 'alice', role: 'admin' });

    users.delete(8);

    assert.deepEqual(
        await opened.emit('bots:list'),
        { success: false, error: 'Session is no longer valid' }
    );
    await opened.flush();
    assert.deepEqual(opened.disconnects, [true], 'the dead session must be closed');

    assert.deepEqual(
        await opened.emit('bot:start', 1),
        { success: false, error: 'Session is no longer valid' }
    );
    await opened.flush();
    assert.deepEqual(opened.botManager.calls.start, [], 'no later handler may run with stale authority');
});

test('a live socket keeps working and follows database role changes', async () => {
    users.clear();
    users.set(8, { id: 8, username: 'alice', role: 'user' });
    const opened = openSocket({ id: 8, username: 'alice', role: 'user' });

    assert.deepEqual((await opened.emit('bots:list')).bots.map((bot) => bot.name), ['alice-bot']);
    assert.deepEqual(await opened.emit('bot:start', 1), { success: true });

    users.set(8, { id: 8, username: 'alice', role: 'admin' });

    assert.equal((await opened.emit('bots:list')).bots.length, 2, 'a promotion takes effect without reconnecting');
    assert.equal(opened.socket.user.role, 'admin');
    assert.deepEqual(opened.disconnects, [], 'a live account is never disconnected');
});
