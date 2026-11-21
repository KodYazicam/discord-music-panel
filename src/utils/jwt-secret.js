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

/**
 * Minimum length for a configured secret. Shorter HS256 keys are cheap to
 * brute-force offline from a single captured JWT, and the same value also
 * feeds the AES key derivation for stored bot tokens.
 */
const MIN_SECRET_LENGTH = 32;

let generatedSecret = null;

function isPlaceholderSecret(value) {
    if (!value) return true;
    const secret = String(value).trim();
    if (!secret) return true;
    return PLACEHOLDER_SECRETS.some((placeholder) => secret === placeholder || secret.includes(placeholder));
}

function isWeakSecret(value) {
    if (value === undefined || value === null) return false;
    return String(value).trim().length < MIN_SECRET_LENGTH;
}

/**
 * Resolve the JWT signing secret.
 *
 * - A configured, non-placeholder secret of at least MIN_SECRET_LENGTH
 *   characters is returned unchanged.
 * - In production, a missing or placeholder secret throws so every entry
 *   point fails fast instead of signing tokens with a public value; a
 *   configured secret shorter than MIN_SECRET_LENGTH throws as well.
 * - Outside production, one random secret is generated per process and
 *   shared by REST and Socket.IO.
 */
function getJwtSecret(env = process.env) {
    const configured = env.JWT_SECRET;

    if (configured && !isPlaceholderSecret(configured)) {
        if (env.NODE_ENV === 'production' && isWeakSecret(configured)) {
            throw new Error(
                `JWT_SECRET is too short: use at least ${MIN_SECRET_LENGTH} characters so the signing key cannot be brute-forced.`
            );
        }
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

/**
 * Validate the secrets needed to start in production.
 *
 * JWT_SECRET is validated by getJwtSecret(). When TOKEN_ENCRYPTION_KEY is
 * configured it overrides JWT_SECRET for encrypting bot tokens at rest, so it
 * must meet the same bar instead of silently accepting the placeholder value
 * published in .env.example and in the README.
 */
function validateProductionSecrets(env = process.env) {
    if (env.NODE_ENV !== 'production') return;

    getJwtSecret(env);

    const configured = env.TOKEN_ENCRYPTION_KEY;
    if (configured === undefined || configured === null || String(configured).trim() === '') {
        return;
    }

    if (isPlaceholderSecret(configured)) {
        throw new Error(
            `Set a real TOKEN_ENCRYPTION_KEY before starting in production. Refused placeholders: ${PLACEHOLDER_SECRETS.join(', ')}`
        );
    }

    if (isWeakSecret(configured)) {
        throw new Error(
            `TOKEN_ENCRYPTION_KEY is too short: use at least ${MIN_SECRET_LENGTH} characters. Bot tokens would be encrypted with a brute-forceable key.`
        );
    }
}

module.exports = {
    getJwtSecret,
    validateProductionSecrets,
    isPlaceholderSecret,
    isWeakSecret,
    MIN_SECRET_LENGTH,
    PLACEHOLDER_SECRETS
};
