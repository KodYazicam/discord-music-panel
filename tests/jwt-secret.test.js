const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

// Stub the database module; these tests never touch SQLite.
const users = new Map([
    [1, { id: 1, username: 'alice', role: 'admin', email: 'alice@example.com' }]
]);
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        userOperations: {
            count: () => users.size,
            getById: (id) => users.get(Number(id)),
            getByUsername: (username) => [...users.values()].find(user => user.username === username) || null,
            getAll: () => [...users.values()],
            updateLastLogin: () => {}
        },
        botOperations: { getById: () => null, getAll: () => [] },
        statisticsOperations: {},
        playlistOperations: {},
        settingOperations: { get: (_key, fallback) => fallback, set: () => {} },
        guildOperations: {}
    }
};

const {
    getJwtSecret,
    isPlaceholderSecret,
    isWeakSecret,
    MIN_SECRET_LENGTH,
    PLACEHOLDER_SECRETS
} = require('../src/utils/jwt-secret');
const { setupRoutes } = require('../src/api/routes');
const { setupSocketHandlers } = require('../src/api/socket');

const PUBLIC_FALLBACK = 'discord-music-panel-jwt-secret';

function withEnv(overrides, fn) {
    const previous = {};
    for (const key of Object.keys(overrides)) {
        previous[key] = process.env[key];
        if (overrides[key] === undefined) delete process.env[key];
        else process.env[key] = overrides[key];
    }
    try {
        return fn();
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

async function withServer(app, fn) {
    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    try {
        return await fn(`http://127.0.0.1:${server.address().port}`);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

function appWithRoutes() {
    const app = express();
    app.use(express.json());
    setupRoutes(app);
    return app;
}

test('a configured strong JWT_SECRET is used unchanged', () => {
    withEnv({ JWT_SECRET: 'a-configured-secret-that-is-long-enough', NODE_ENV: 'test' }, () => {
        assert.equal(getJwtSecret(), 'a-configured-secret-that-is-long-enough');
    });
});

test('development without JWT_SECRET generates a random, stable per-process secret', () => {
    withEnv({ JWT_SECRET: undefined, NODE_ENV: 'test' }, () => {
        const first = getJwtSecret();
        const second = getJwtSecret();

        assert.equal(first, second, 'generated secret must be stable for the process');
        assert.equal(first.length, 96, 'expected a 48-byte hex secret');
        assert.match(first, /^[0-9a-f]{96}$/);
        assert.notEqual(first, PUBLIC_FALLBACK);
    });
});

test('production refuses a missing JWT_SECRET', () => {
    withEnv({ JWT_SECRET: undefined, NODE_ENV: 'production' }, () => {
        assert.throws(() => getJwtSecret(), /JWT_SECRET/);
    });
});

test('production refuses every documented placeholder secret', () => {
    for (const placeholder of PLACEHOLDER_SECRETS) {
        withEnv({ JWT_SECRET: placeholder, NODE_ENV: 'production' }, () => {
            assert.equal(isPlaceholderSecret(placeholder), true);
            assert.throws(() => getJwtSecret(), /JWT_SECRET/, `placeholder ${placeholder} must be refused`);
        });
    }
});

test('the old public fallback secret is not accepted by the REST API', async () => {
    await withEnv({ JWT_SECRET: undefined, NODE_ENV: 'test' }, async () => {
        const app = appWithRoutes();
        const forged = jwt.sign({ id: 1, username: 'alice', role: 'admin' }, PUBLIC_FALLBACK);

        await withServer(app, async (base) => {
            const response = await fetch(`${base}/api/auth/me`, {
                headers: { Authorization: `Bearer ${forged}`, Accept: 'application/json' }
            });
            assert.equal(response.status, 401, 'forged token must not authenticate');
        });
    });
});

test('the old public fallback secret is not accepted by the Socket.IO handshake', () => {
    withEnv({ JWT_SECRET: undefined, NODE_ENV: 'test' }, () => {
        let middleware;
        const io = {
            use: (fn) => { middleware = fn; },
            on: () => {},
            to: () => ({ emit: () => {} })
        };
        setupSocketHandlers(io, {}, {});

        const forged = jwt.sign({ id: 1, username: 'alice', role: 'admin' }, PUBLIC_FALLBACK);
        let error = null;
        const socket = { handshake: { auth: { token: forged } } };
        middleware(socket, (err) => { error = err; });

        assert.ok(error instanceof Error);
        assert.match(error.message, /Invalid token/);
    });
});

test('a valid token signed with the resolved secret still authenticates', async () => {
    await withEnv({ JWT_SECRET: undefined, NODE_ENV: 'test' }, async () => {
        const app = appWithRoutes();
        const secret = getJwtSecret();
        const token = jwt.sign({ id: 1, username: 'alice', role: 'admin' }, secret);

        await withServer(app, async (base) => {
            const response = await fetch(`${base}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            });
            assert.equal(response.status, 200);
            const body = await response.json();
            assert.equal(body.user.username, 'alice');
        });
    });
});

test('setupRoutes throws in production instead of signing with a placeholder', () => {
    withEnv({ JWT_SECRET: PUBLIC_FALLBACK, NODE_ENV: 'production' }, () => {
        assert.throws(() => appWithRoutes(), /JWT_SECRET/);
    });
});

test('the documented minimum secret length is 32 characters', () => {
    assert.equal(MIN_SECRET_LENGTH, 32);
    assert.equal(isWeakSecret('x'.repeat(31)), true, '31 characters is too short');
    assert.equal(isWeakSecret('x'.repeat(32)), false, '32 characters is the minimum');
    assert.equal(isWeakSecret('   '), true, 'whitespace-only is not a secret');
    assert.equal(isWeakSecret(undefined), false, 'an unset secret is handled by the placeholder/missing path');
});

test('production refuses a configured secret shorter than the minimum', () => {
    withEnv({ JWT_SECRET: 'short-secret', NODE_ENV: 'production' }, () => {
        assert.equal(isPlaceholderSecret('short-secret'), false, 'this is a length problem, not a placeholder');
        assert.throws(() => getJwtSecret(), /at least 32 characters/);
    });
});

test('production refuses a 31-character secret and accepts exactly 32', () => {
    withEnv({ JWT_SECRET: 'x'.repeat(31), NODE_ENV: 'production' }, () => {
        assert.throws(() => getJwtSecret(), /at least 32 characters/);
    });
    const exactlyMinimum = 'x'.repeat(32);
    withEnv({ JWT_SECRET: exactlyMinimum, NODE_ENV: 'production' }, () => {
        assert.equal(getJwtSecret(), exactlyMinimum);
    });
});

test('outside production a configured short secret is still used unchanged', () => {
    withEnv({ JWT_SECRET: 'short-secret', NODE_ENV: 'test' }, () => {
        assert.equal(getJwtSecret(), 'short-secret');
    });
});

test('setupRoutes throws in production when a configured secret is too short', () => {
    withEnv({ JWT_SECRET: 'short-secret', NODE_ENV: 'production' }, () => {
        assert.throws(() => appWithRoutes(), /at least 32 characters/);
    });
});
