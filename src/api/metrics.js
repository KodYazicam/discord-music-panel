/**
 * Optional Prometheus metrics export.
 *
 * Disabled unless METRICS_ENABLED=true. When enabled, GET /metrics requires
 * either METRICS_TOKEN or a valid panel JWT. The module keeps only aggregate
 * counters and low-cardinality labels; bot tokens and guild identifiers never
 * enter the output.
 */

const crypto = require('crypto');

const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

const requestCounts = new Map();
const requestDurations = new Map();

function metricsEnabled() {
    return process.env.METRICS_ENABLED === 'true';
}

function resetMetrics() {
    requestCounts.clear();
    requestDurations.clear();
}

function escapeLabel(value) {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/"/g, '\\"');
}

function formatNumber(value) {
    if (!Number.isFinite(value)) return '0';
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(6)).toString();
}

function routeLabel(req) {
    if (!req.route || !req.route.path) return 'unmatched';
    const path = Array.isArray(req.route.path) ? req.route.path.join('|') : req.route.path;
    const route = `${req.baseUrl || ''}${path}`;
    return route || 'unmatched';
}

function recordRequest(method, route, status, durationSeconds) {
    const countKey = `${method}\u0000${route}\u0000${status}`;
    requestCounts.set(countKey, (requestCounts.get(countKey) || 0) + 1);

    const durationKey = `${method}\u0000${route}`;
    const entry = requestDurations.get(durationKey) || {
        count: 0,
        sum: 0,
        buckets: DURATION_BUCKETS.map(() => 0)
    };

    entry.count += 1;
    entry.sum += durationSeconds;
    DURATION_BUCKETS.forEach((bucket, index) => {
        if (durationSeconds <= bucket) entry.buckets[index] += 1;
    });
    requestDurations.set(durationKey, entry);
}

/**
 * Express middleware that records route-pattern based request counts and
 * durations after each response finishes.
 */
function requestMetricsMiddleware() {
    return (req, res, next) => {
        const startedAt = process.hrtime.bigint();
        const originalEnd = res.end;
        let recorded = false;

        // Capture the route while the handler still owns req.baseUrl/req.route.
        // Express restores those fields before the response 'finish' event.
        res.end = function metricsEnd(...args) {
            if (!recorded) {
                recorded = true;
                const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
                recordRequest(req.method, routeLabel(req), res.statusCode, durationSeconds);
            }
            return originalEnd.apply(this, args);
        };

        next();
    };
}

function parseBearer(header) {
    const value = String(header || '').trim();
    if (!value.toLowerCase().startsWith('bearer ')) return null;
    const token = value.slice(7).trim();
    return token || null;
}

function tokensMatch(expected, provided) {
    const left = Buffer.from(String(expected));
    const right = Buffer.from(String(provided));
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

/**
 * Auth guard for /metrics. Disabled metrics fall through so the route can
 * return 404 without asking for credentials.
 */
function createMetricsAuth(authMiddleware) {
    return (req, res, next) => {
        if (!metricsEnabled()) return next();

        const expected = process.env.METRICS_TOKEN;
        if (expected) {
            const provided = parseBearer(req.headers.authorization);
            if (!provided || !tokensMatch(expected, provided)) {
                return res.status(401).json({ success: false, error: 'Invalid metrics token' });
            }
            return next();
        }

        return authMiddleware(req, res, next);
    };
}

function requestLines() {
    const lines = [
        '# HELP http_requests_total Total HTTP requests handled by the panel.',
        '# TYPE http_requests_total counter'
    ];

    const keys = [...requestCounts.keys()].sort();
    for (const key of keys) {
        const [method, route, status] = key.split('\u0000');
        lines.push(
            `http_requests_total{method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${escapeLabel(status)}"} ${requestCounts.get(key)}`
        );
    }

    lines.push(
        '# HELP http_request_duration_seconds HTTP request duration in seconds.',
        '# TYPE http_request_duration_seconds histogram'
    );

    const durationKeys = [...requestDurations.keys()].sort();
    for (const key of durationKeys) {
        const [method, route] = key.split('\u0000');
        const entry = requestDurations.get(key);
        const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}"`;

        DURATION_BUCKETS.forEach((bucket, index) => {
            lines.push(
                `http_request_duration_seconds_bucket{${labels},le="${bucket}"} ${entry.buckets[index]}`
            );
        });
        lines.push(
            `http_request_duration_seconds_bucket{${labels},le="+Inf"} ${entry.count}`,
            `http_request_duration_seconds_sum{${labels}} ${formatNumber(entry.sum)}`,
            `http_request_duration_seconds_count{${labels}} ${entry.count}`
        );
    }

    return lines;
}

function botLines(botManager) {
    let bots = [];
    try {
        bots = botManager?.getAllBots?.() || [];
    } catch {
        bots = [];
    }

    const running = bots
        .filter((bot) => bot && bot.status === 'online')
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));

    const lines = [
        '# HELP music_queue_depth Tracks queued per running bot.',
        '# TYPE music_queue_depth gauge'
    ];
    for (const bot of running) {
        lines.push(
            `music_queue_depth{bot_id="${escapeLabel(bot.id)}"} ${Number(bot.totalQueuedSongs) || 0}`
        );
    }

    lines.push(
        '# HELP music_active_players Active players per running bot.',
        '# TYPE music_active_players gauge'
    );
    for (const bot of running) {
        lines.push(
            `music_active_players{bot_id="${escapeLabel(bot.id)}"} ${Number(bot.playingCount) || 0}`
        );
    }

    return lines;
}

async function ytDlpLines(checkYtDlp) {
    let health = { available: false, checkedAt: null };
    try {
        health = (await checkYtDlp()) || health;
    } catch {
        health = { available: false, checkedAt: null };
    }

    const lines = [
        '# HELP ytdlp_available Whether the cached yt-dlp health probe succeeded (1) or failed (0).',
        '# TYPE ytdlp_available gauge',
        `ytdlp_available ${health.available ? 1 : 0}`
    ];

    const checkedAt = Number(health.checkedAt);
    if (Number.isFinite(checkedAt) && checkedAt > 0) {
        lines.push(
            '# HELP ytdlp_last_check_timestamp_seconds Unix timestamp of the last yt-dlp health check.',
            '# TYPE ytdlp_last_check_timestamp_seconds gauge',
            `ytdlp_last_check_timestamp_seconds ${formatNumber(checkedAt / 1000)}`
        );
    }

    return lines;
}

/**
 * Render the Prometheus text exposition for the current process state.
 */
async function renderMetrics({ botManager, checkYtDlp }) {
    const lines = [
        ...requestLines(),
        ...botLines(botManager),
        ...(await ytDlpLines(checkYtDlp))
    ];
    return `${lines.join('\n')}\n`;
}

module.exports = {
    metricsEnabled,
    resetMetrics,
    requestMetricsMiddleware,
    createMetricsAuth,
    renderMetrics
};
