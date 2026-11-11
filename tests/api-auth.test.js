const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'auth-rate-limit-test-secret';

const users = new Map();
const settings = new Map();
let nextUserId = 1;

function resetState() {
    users.clear();
    settings.clear();
    nextUserId = 1;
}

function seedUser({ username = 'alice', password = 'correct-password', role = 'user', email = 'alice@example.com' } = {}) {
    const id = nextUserId++;
    users.set(id, {
        id,
        username,
        password: bcrypt.hashSync(password, 4),
        email,
        role,
        created_at: '2026-01-01T00:00:00.000Z',
        last_login: null
    });
    return id;
}

function publicUser(user) {
    if (!user) return undefined;
    const { password, ...rest } = user;
    return rest;
}

const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        userOperations: {
            count: () => users.size,
            getAll: () => [...users.values()].map(publicUser),
            getByUsername: (username) => [...users.values()].find(user => user.username === username) || undefined,
            getById: (id) => publicUser(users.get(Number(id))),
            getAuthById: (id) => users.get(Number(id)),
            create: (username, password, email, role = 'user') => {
                const id = nextUserId++;
                users.set(id, {
                    id,
                    username,
                    password,
                    email,
                    role,
                    created_at: '2026-01-01T00:00:00.000Z',
                    last_login: null
                });
                return id;
            },
            updateProfile: (id, username, email) => {
                Object.assign(users.get(Number(id)), { username, email });
            },
            updatePassword: (id, password) => {
                users.get(Number(id)).password = password;
            },
            updateLastLogin: (id) => {
                users.get(Number(id)).last_login = '2026-01-02T00:00:00.000Z';
            }
        },
        settingOperations: {
            get: (key, fallback = null) => (settings.has(key) ? settings.get(key) : fallback),
            set: (key, value) => settings.set(key, value)
        },
        botOperations: { getById: () => null, getAll: () => [] },
        statisticsOperations: {},
        playlistOperations: {},
        guildOperations: {}
    }
};

const { setupRoutes } = require('../src/api/routes');

const healthyDb = {
    prepare: () => ({ get: () => ({ ok: 1 }) })
};

async function startServer(t, { maxRequests = 1000 } = {}) {
    const previousMax = process.env.RATE_LIMIT_MAX_REQUESTS;
    const previousWindow = process.env.RATE_LIMIT_WINDOW_MS;

    process.env.RATE_LIMIT_MAX_REQUESTS = String(maxRequests);
    process.env.RATE_LIMIT_WINDOW_MS = '60000';

    t.after(() => {
        if (previousMax === undefined) delete process.env.RATE_LIMIT_MAX_REQUESTS;
        else process.env.RATE_LIMIT_MAX_REQUESTS = previousMax;

        if (previousWindow === undefined) delete process.env.RATE_LIMIT_WINDOW_MS;
        else process.env.RATE_LIMIT_WINDOW_MS = previousWindow;
    });

    const app = express();
    app.use(express.json());
    app.set('db', healthyDb);
    app.set('botManager', null);
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

test('register rejects missing credentials and short passwords', async (t) => {
    resetState();
    const base = await startServer(t);

    const missing = await request(base, '/api/auth/register', { method: 'POST', body: {} });
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).error, 'Username and password required');

    const short = await request(base, '/api/auth/register', {
        method: 'POST',
        body: { username: 'alice', password: 'short' }
    });
    assert.equal(short.status, 400);
    assert.equal((await short.json()).error, 'Password must be at least 8 characters');
});

test('register is closed once an admin exists', async (t) => {
    resetState();
    seedUser({ role: 'admin' });
    settings.set('registration_open', '0');
    const base = await startServer(t);

    const response = await request(base, '/api/auth/register', {
        method: 'POST',
        body: { username: 'bob', password: 'long-enough-password' }
    });

    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /Registration is closed/);
});

test('first registration becomes admin and closes registration', async (t) => {
    resetState();
    const base = await startServer(t);

    const response = await request(base, '/api/auth/register', {
        method: 'POST',
        body: { username: 'founder', password: 'long-enough-password', email: 'founder@example.com' }
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'admin');
    assert.equal(settings.get('registration_open'), '0');

    const decoded = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(decoded.username, 'founder');
    assert.equal(decoded.role, 'admin');

    const stored = users.get(body.user.id);
    assert.notEqual(stored.password, 'long-enough-password');
    assert.equal(bcrypt.compareSync('long-enough-password', stored.password), true);
});

test('login rejects unknown users and wrong passwords', async (t) => {
    resetState();
    seedUser({ username: 'alice', password: 'correct-password' });
    const base = await startServer(t);

    const unknown = await request(base, '/api/auth/login', {
        method: 'POST',
        body: { username: 'nobody', password: 'correct-password' }
    });
    assert.equal(unknown.status, 401);
    assert.equal((await unknown.json()).error, 'Invalid credentials');

    const wrongPassword = await request(base, '/api/auth/login', {
        method: 'POST',
        body: { username: 'alice', password: 'wrong-password' }
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal((await wrongPassword.json()).error, 'Invalid credentials');
});

test('login returns a token and updates last login', async (t) => {
    resetState();
    const id = seedUser({ username: 'alice', password: 'correct-password' });
    const base = await startServer(t);

    const response = await request(base, '/api/auth/login', {
        method: 'POST',
        body: { username: 'alice', password: 'correct-password' }
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.username, 'alice');
    assert.equal(body.user.id, id);
    assert.equal(users.get(id).last_login, '2026-01-02T00:00:00.000Z');

    const decoded = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(decoded.id, id);
});

test('/api/auth/me rejects missing and invalid tokens', async (t) => {
    resetState();
    const base = await startServer(t);

    const missing = await request(base, '/api/auth/me');
    assert.equal(missing.status, 401);

    const invalid = await request(base, '/api/auth/me', { token: 'not-a-jwt' });
    assert.equal(invalid.status, 401);
    assert.equal((await invalid.json()).error, 'Invalid token');
});

test('/api/auth/me returns the current user and 404s for deleted users', async (t) => {
    resetState();
    const id = seedUser({ username: 'alice' });
    const base = await startServer(t);
    const token = jwt.sign({ id, username: 'alice', role: 'user' }, process.env.JWT_SECRET);

    const response = await request(base, '/api/auth/me', { token });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.username, 'alice');
    assert.equal(body.user.password, undefined);

    users.delete(id);
    const deleted = await request(base, '/api/auth/me', { token });
    assert.equal(deleted.status, 404);
    assert.equal((await deleted.json()).error, 'User not found');
});

test('/api/users requires an admin token', async (t) => {
    resetState();
    const userId = seedUser({ username: 'alice', role: 'user' });
    const base = await startServer(t);

    const userToken = jwt.sign({ id: userId, username: 'alice', role: 'user' }, process.env.JWT_SECRET);
    const forbidden = await request(base, '/api/users', { token: userToken });
    assert.equal(forbidden.status, 403);
    assert.equal((await forbidden.json()).error, 'Admin only');

    const adminToken = jwt.sign({ id: userId, username: 'alice', role: 'admin' }, process.env.JWT_SECRET);
    const allowed = await request(base, '/api/users', { token: adminToken });
    assert.equal(allowed.status, 200);
    const body = await allowed.json();
    assert.equal(body.users.length, 1);
    assert.equal(body.users[0].username, 'alice');
    assert.equal(body.users[0].password, undefined);
    assert.equal(body.registrationOpen, false);
});

test('global API limiter returns 429 with a JSON error after the limit', async (t) => {
    resetState();
    const base = await startServer(t, { maxRequests: 2 });

    const first = await request(base, '/api/health');
    const second = await request(base, '/api/health');
    const third = await request(base, '/api/health');

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);

    const body = await third.json();
    assert.equal(body.success, false);
    assert.equal(body.error, 'Too many requests, try again later');
    assert.ok(third.headers.get('ratelimit') || third.headers.get('ratelimit-limit'));
});
