/**
 * Per-guild playback preset validation.
 * Shared by the API (write path) and the database layer (read path).
 */

const LOOP_MODES = ['off', 'track', 'queue'];

class PresetValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PresetValidationError';
    }
}

function requireInteger(value, field, min, max) {
    if (!Number.isInteger(value)) {
        throw new PresetValidationError(`${field} must be an integer`);
    }
    if (value < min || value > max) {
        throw new PresetValidationError(`${field} must be between ${min} and ${max}`);
    }
    return value;
}

function requireBoolean(value, field) {
    if (typeof value !== 'boolean') {
        throw new PresetValidationError(`${field} must be a boolean`);
    }
    return value;
}

/**
 * Validate and copy an allowlisted preset object.
 * Throws PresetValidationError for unknown keys or invalid values.
 */
function normalizePresets(input) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        throw new PresetValidationError('Presets must be an object');
    }

    const presets = {};

    for (const [key, value] of Object.entries(input)) {
        switch (key) {
            case 'volume':
                presets.volume = requireInteger(value, 'volume', 0, 200);
                break;
            case 'maxQueueSize':
                presets.maxQueueSize = requireInteger(value, 'maxQueueSize', 1, 500);
                break;
            case 'defaultLoopMode':
                if (!LOOP_MODES.includes(value)) {
                    throw new PresetValidationError(`defaultLoopMode must be one of: ${LOOP_MODES.join(', ')}`);
                }
                presets.defaultLoopMode = value;
                break;
            case 'announceSongs':
                presets.announceSongs = requireBoolean(value, 'announceSongs');
                break;
            case 'stayInChannel':
                presets.stayInChannel = requireBoolean(value, 'stayInChannel');
                break;
            default:
                throw new PresetValidationError(`Unknown preset field: ${key}`);
        }
    }

    return presets;
}

/**
 * Parse a JSON value from bot_guilds.presets. Corrupt legacy values degrade to
 * an empty preset instead of breaking playback.
 */
function parseStoredPresets(raw) {
    if (raw === null || raw === undefined || raw === '') return {};

    try {
        return normalizePresets(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } catch {
        return {};
    }
}

module.exports = {
    LOOP_MODES,
    PresetValidationError,
    normalizePresets,
    parseStoredPresets
};
