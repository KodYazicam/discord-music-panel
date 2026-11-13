const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'metrics-test-secret';

// Stub the database module before routes load. These tests never touch SQLite.
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        userOperations: {
            count: () => 0,
            getByUsername: () => null
        },
        botOperations: {
            getById: () => null,
            getAll: () => []
        },
        statisticsOperations: {},
        playlistOperations: {},
        settingOperations: {
            get: (_key, fallback) => fallback,
            set: () => {}
        },
        guildOperations: {}
    }
};

const { setupRoutes } = require('../src/api/routes');
const { resetMetrics } = require('../src/api/metrics');

const METRICS_TOKEN = 'test-metrics-token';

function healthyDb() {
    return {
        prepare(sql) {
            assert.equal(sql, 'SELECT 1');
            return { get: () => ({ ok: 1 }) };
        }
    };
}

function sampleBotManager() {
    return {
        getGlobalStats: () => ({
            runningBots: 1,
            totalBots: 1,
            totalGuilds: 2,
            totalPlaying: 1,
            totalQueued: 4,
            totalUsers: 10
        }),
        getAllBots: () => [
            {
                id: 'bot-1',
                name: 'Music One',
                status: 'online',
                guildCount: 2,
                playingCount: 1,
                totalQueuedSongs: 4,
                uptime: 1234,
                token: 'super-secret-token',
                clientId: 'secret-client-id',
                guilds: [{ id: 'secret-guild', name: 'Secret Guild' }],
                settings: { djRoleId: 'secret-role' }
            }
        ]
    };
}

async function startServer(t, options = {}) {
    const {
        metricsEnabled = true,
        metricsToken = METRICS_TOKEN,
        botManager = sampleBotManager(),
        ytDlpHealth = async () => ({ available: true, version: '2026.11.01', checkedAt: 1700000000000 })
    } = options;

    const previous = {
        METRICS_ENABLED: process.env.METRICS_ENABLED,
        METRICS_TOKEN: process.env.METRICS_TOKEN
    };

    process.env.METRICS_ENABLED = metricsEnabled ? 'true' : 'false';
    if (metricsToken === null) {
        delete process.env.METRICS_TOKEN;
    } else {
        process.env.METRICS_TOKEN = metricsToken;
    }

    resetMetrics();

    const app = express();
    app.use(express.json());
    app.set('db', healthyDb());
    app.set('botManager', botManager);
    app.set('ytDlpHealth', ytDlpHealth);
    setupRoutes(app);

    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));

    t.after(() => new Promise((resolve) => {
        server.close(resolve);
        if (previous.METRICS_ENABLED === undefined) delete process.env.METRICS_ENABLED;
        else process.env.METRICS_ENABLED = previous.METRICS_ENABLED;
        if (previous.METRICS_TOKEN === undefined) delete process.env.METRICS_TOKEN;
        else process.env.METRICS_TOKEN = previous.METRICS_TOKEN;
    }));

    return `http://127.0.0.1:${server.address().port}`;
}

async function scrape(base, token = METRICS_TOKEN) {
    return fetch(`${base}/metrics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
}

async function settle() {
    await new Promise(resolve => setTimeout(resolve, 15));
}

test('GET /metrics returns 404 when metrics are disabled', async (t) => {
    const base = await startServer(t, { metricsEnabled: false });
    const response = await scrape(base, null);

    assert.equal(response.status, 404);
});

test('GET /metrics requires authentication when enabled', async (t) => {
    const base = await startServer(t);

    const missing = await scrape(base, null);
    assert.equal(missing.status, 401);

    const wrong = await scrape(base, 'wrong-token');
    assert.equal(wrong.status, 401);
});

test('GET /metrics accepts METRICS_TOKEN and returns Prometheus text', async (t) => {
    const base = await startServer(t);

    await fetch(`${base}/api/health`).then(response => response.text());
    await settle();

    const response = await scrape(base);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    assert.equal(response.headers.get('cache-control'), 'no-store');

    const body = await response.text();
    assert.match(body, /# HELP http_requests_total/);
    assert.match(body, /# TYPE http_requests_total counter/);
    assert.match(body, /# TYPE http_request_duration_seconds histogram/);
    assert.match(body, /http_requests_total\{method="GET",route="\/api\/health",status="200"\} 1/);
    assert.match(body, /http_request_duration_seconds_count\{method="GET",route="\/api\/health"\} 1/);
    assert.match(body, /music_queue_depth\{bot_id="bot-1"\} 4/);
    assert.match(body, /music_active_players\{bot_id="bot-1"\} 1/);
    assert.match(body, /ytdlp_available 1/);
});

test('GET /metrics counts route-based requests and durations', async (t) => {
    const base = await startServer(t);

    await fetch(`${base}/api/health`).then(response => response.text());
    await fetch(`${base}/api/health`).then(response => response.text());
    await fetch(`${base}/api/status`).then(response => response.text());
    await settle();

    const body = await (await scrape(base)).text();

    assert.match(body, /http_requests_total\{method="GET",route="\/api\/health",status="200"\} 2/);
    assert.match(body, /http_requests_total\{method="GET",route="\/api\/status",status="200"\} 1/);
    assert.match(body, /http_request_duration_seconds_count\{method="GET",route="\/api\/health"\} 2/);
    assert.match(body, /http_request_duration_seconds_count\{method="GET",route="\/api\/status"\} 1/);
});

test('queue depth and active player gauges follow real bot values', async (t) => {
    let queueDepth = 0;
    let activePlayers = 0;

    const base = await startServer(t, {
        botManager: {
            getAllBots: () => [
                {
                    id: 'bot-1',
                    name: 'Music One',
                    status: 'online',
                    totalQueuedSongs: queueDepth,
                    playingCount: activePlayers
                }
            ]
        }
    });

    const first = await (await scrape(base)).text();
    assert.match(first, /music_queue_depth\{bot_id="bot-1"\} 0/);
    assert.match(first, /music_active_players\{bot_id="bot-1"\} 0/);

    queueDepth = 3;
    activePlayers = 2;

    const second = await (await scrape(base)).text();
    assert.match(second, /music_queue_depth\{bot_id="bot-1"\} 3/);
    assert.match(second, /music_active_players\{bot_id="bot-1"\} 2/);
});

test('GET /metrics falls back to a panel JWT when METRICS_TOKEN is unset', async (t) => {
    const base = await startServer(t, { metricsToken: null });
    const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, process.env.JWT_SECRET);

    const unauthenticated = await scrape(base, null);
    assert.equal(unauthenticated.status, 401);

    const response = await scrape(base, token);
    assert.equal(response.status, 200);
});

test('GET /metrics reports an unavailable yt-dlp probe as zero', async (t) => {
    const base = await startServer(t, {
        ytDlpHealth: async () => ({ available: false, version: null, error: 'not installed', checkedAt: null })
    });

    const body = await (await scrape(base)).text();
    assert.match(body, /ytdlp_available 0/);
    assert.doesNotMatch(body, /ytdlp_last_check_timestamp_seconds/);
});

test('GET /metrics never exposes bot tokens or identifiers', async (t) => {
    const base = await startServer(t);
    const body = await (await scrape(base)).text();

    for (const secret of ['super-secret-token', 'secret-client-id', 'secret-guild', 'Secret Guild', 'secret-role']) {
        assert.equal(body.includes(secret), false, `metrics leaked ${secret}`);
    }
});
