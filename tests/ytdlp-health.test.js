const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { checkYtDlpHealth, resetYtDlpHealthCache } = require('../src/bot/ytdlp');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytdlp-health-'));

function fakeBinary(name, body) {
    const file = path.join(tempDir, name);
    fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    return file;
}

function useBinary(t, binary, timeoutMs) {
    const previousPath = process.env.YTDLP_PATH;
    const previousTimeout = process.env.YTDLP_HEALTH_TIMEOUT_MS;

    process.env.YTDLP_PATH = binary;
    if (timeoutMs) {
        process.env.YTDLP_HEALTH_TIMEOUT_MS = String(timeoutMs);
    } else {
        delete process.env.YTDLP_HEALTH_TIMEOUT_MS;
    }

    resetYtDlpHealthCache();
    t.after(() => {
        if (previousPath === undefined) delete process.env.YTDLP_PATH;
        else process.env.YTDLP_PATH = previousPath;

        if (previousTimeout === undefined) delete process.env.YTDLP_HEALTH_TIMEOUT_MS;
        else process.env.YTDLP_HEALTH_TIMEOUT_MS = previousTimeout;

        resetYtDlpHealthCache();
    });
}

test.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
});

test('reports the version from a working binary', async (t) => {
    useBinary(t, fakeBinary('ok', 'echo "2026.11.01"'));

    const health = await checkYtDlpHealth({ force: true });

    assert.equal(health.available, true);
    assert.equal(health.version, '2026.11.01');
    assert.equal(health.error, null);
    assert.equal(typeof health.checkedAt, 'number');
    assert.ok(health.checkedAt > 0);
});

test('caches results and can be forced to re-check', async (t) => {
    const log = path.join(tempDir, 'runs.log');
    const binary = fakeBinary('counting', `echo run >> "${log}"\necho "2026.11.01"`);
    useBinary(t, binary);

    await checkYtDlpHealth({ force: true });
    await checkYtDlpHealth();
    await checkYtDlpHealth();

    assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 1);

    await checkYtDlpHealth({ force: true });

    assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 2);
});

test('reports a non-zero exit with the last stderr line', async (t) => {
    useBinary(t, fakeBinary('failing', 'echo "first line" >&2\necho "final failure" >&2\nexit 2'));

    const health = await checkYtDlpHealth({ force: true });

    assert.equal(health.available, false);
    assert.equal(health.version, null);
    assert.equal(health.error, 'final failure');
});

test('reports a missing binary without rejecting', async (t) => {
    useBinary(t, path.join(tempDir, 'does-not-exist'));

    const health = await checkYtDlpHealth({ force: true });

    assert.equal(health.available, false);
    assert.equal(health.version, null);
    assert.match(health.error, /yt-dlp is not installed/);
});

test('reports an empty version response', async (t) => {
    useBinary(t, fakeBinary('empty', 'exit 0'));

    const health = await checkYtDlpHealth({ force: true });

    assert.equal(health.available, false);
    assert.equal(health.error, 'yt-dlp returned an empty version');
});

test('times out a hanging binary', async (t) => {
    useBinary(t, fakeBinary('slow', 'sleep 5'), 100);

    const startedAt = Date.now();
    const health = await checkYtDlpHealth({ force: true });

    assert.equal(health.available, false);
    assert.equal(health.error, 'yt-dlp health check timed out');
    assert.ok(Date.now() - startedAt < 3000);
});

test('clamps invalid timeout values instead of failing', async (t) => {
    useBinary(t, fakeBinary('ok-clamped', 'echo "2026.11.01"'), -5);

    const health = await checkYtDlpHealth({ force: true });

    assert.equal(health.available, true);
    assert.equal(health.version, '2026.11.01');
});
