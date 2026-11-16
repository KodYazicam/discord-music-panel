/**
 * JWT secret resolver.
 *
 * A deployment must provide a real secret. Development keeps working without
 * one, but the fallback is a random per-process value instead of a constant
 * that is published with the source code.
 */

const crypto = require('crypto');

const PLACEHOLDER_SECRETS = [
    'change-this',
    'your-super-secret-jwt-key-change-this-in-production',
    'your-secret-key-minimum-32-characters',
    'discord-music-panel-jwt-secret'
];

const GENERATED_SECRET_BYTES = 48;

let generatedSecret = null;

function isPlaceholderSecret(value) {
    if (!value) return true;
    const secret = String(value).trim();
    if (!secret) return true;
    return PLACEHOLDER_SECRETS.some((placeholder) => secret === placeholder || secret.includes(placeholder));
}

/**
 * Resolve the JWT signing secret.
 *
 * - A configured, non-placeholder secret is returned unchanged.
 * - In production, a missing or placeholder secret throws so every entry
 *   point fails fast instead of signing tokens with a public value.
 * - Outside production, one random secret is generated per process and
 *   shared by REST and Socket.IO.
 */
function getJwtSecret(env = process.env) {
    const configured = env.JWT_SECRET;

    if (configured && !isPlaceholderSecret(configured)) {
        return configured;
    }

    if (env.NODE_ENV === 'production') {
        throw new Error(
            'JWT_SECRET is required in production: set a strong, non-placeholder value before starting the panel.'
        );
    }

    if (!generatedSecret) {
        generatedSecret = crypto.randomBytes(GENERATED_SECRET_BYTES).toString('hex');
    }
    return generatedSecret;
}

module.exports = { getJwtSecret, isPlaceholderSecret, PLACEHOLDER_SECRETS };
