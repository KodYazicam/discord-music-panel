const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const {
    validateProductionSecrets,
    MIN_SECRET_LENGTH
} = require('../src/utils/jwt-secret');

const STRONG_JWT = 'j'.repeat(MIN_SECRET_LENGTH);
const PLACEHOLDER_KEY = 'change-this-token-encryption-key';
const STRONG_KEY = 'k'.repeat(MIN_SECRET_LENGTH);
const root = path.join(__dirname, '..');

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

test('production refuses the documented placeholder TOKEN_ENCRYPTION_KEY', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: STRONG_JWT, TOKEN_ENCRYPTION_KEY: PLACEHOLDER_KEY }, () => {
        assert.throws(() => validateProductionSecrets(), /TOKEN_ENCRYPTION_KEY/);
    });
});

test('production refuses a TOKEN_ENCRYPTION_KEY shorter than the minimum', () => {
    withEnv({
        NODE_ENV: 'production',
        JWT_SECRET: STRONG_JWT,
        TOKEN_ENCRYPTION_KEY: 'k'.repeat(MIN_SECRET_LENGTH - 1)
    }, () => {
        assert.throws(
            () => validateProductionSecrets(),
            new RegExp(`TOKEN_ENCRYPTION_KEY.*at least ${MIN_SECRET_LENGTH} characters`)
        );
    });
});

test('production accepts a strong TOKEN_ENCRYPTION_KEY', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: STRONG_JWT, TOKEN_ENCRYPTION_KEY: STRONG_KEY }, () => {
        assert.doesNotThrow(() => validateProductionSecrets());
    });
});

test('production falls back to the validated JWT_SECRET when TOKEN_ENCRYPTION_KEY is unset', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: STRONG_JWT, TOKEN_ENCRYPTION_KEY: undefined }, () => {
        assert.doesNotThrow(() => validateProductionSecrets());
    });
});

test('a placeholder TOKEN_ENCRYPTION_KEY cannot hide a missing JWT_SECRET', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: undefined, TOKEN_ENCRYPTION_KEY: STRONG_KEY }, () => {
        assert.throws(() => validateProductionSecrets(), /JWT_SECRET/);
    });
});

test('development keeps accepting the documented placeholder key', () => {
    withEnv({ NODE_ENV: 'development', JWT_SECRET: undefined, TOKEN_ENCRYPTION_KEY: PLACEHOLDER_KEY }, () => {
        assert.doesNotThrow(() => validateProductionSecrets());
    });
});

test('production startup exits before initializing the database when the key is a placeholder', () => {
    const dbPath = path.join(os.tmpdir(), `dmp-token-key-${process.pid}-${Date.now()}.sqlite`);
    const result = spawnSync(process.execPath, ['src/index.js'], {
        cwd: root,
        env: {
            ...process.env,
            NODE_ENV: 'production',
            JWT_SECRET: STRONG_JWT,
            TOKEN_ENCRYPTION_KEY: PLACEHOLDER_KEY,
            DATABASE_PATH: dbPath,
            PORT: '0',
            LOG_LEVEL: 'error'
        },
        encoding: 'utf8',
        timeout: 20000
    });

    try {
        assert.equal(result.signal, null, 'the server must exit on its own, not be killed by the timeout');
        assert.equal(result.status, 1);
        assert.match(`${result.stdout}${result.stderr}`, /TOKEN_ENCRYPTION_KEY/);
        assert.equal(fs.existsSync(dbPath), false, 'validation must run before initDatabase()');
    } finally {
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    }
});
