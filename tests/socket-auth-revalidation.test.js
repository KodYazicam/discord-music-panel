const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'socket-auth-revalidation-test-secret';

const users = new Map();

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
            getById: () => null,
            getAll: () => []
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
