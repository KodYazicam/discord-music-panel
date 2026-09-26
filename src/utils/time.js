/**
 * Time helpers shared by the seek/jump text and slash commands.
 */

/**
 * Parse a user-supplied time string into seconds.
 * Accepts "90", "1:30", "01:30:15". Returns null when the input is not a
 * valid non-negative time.
 */
function parseTimeToSeconds(input) {
    if (typeof input !== 'string' || !input.trim()) return null;
    const text = input.trim();

    if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(text)) return null;

    const parts = text.split(':').map((part) => parseInt(part, 10));
    if (parts.some((part) => Number.isNaN(part))) return null;

    let seconds = 0;
    for (const part of parts) {
        seconds = seconds * 60 + part;
    }
    return seconds;
}

/**
 * Format seconds as m:ss or h:mm:ss (mirrors the queue display).
 */
function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

module.exports = { parseTimeToSeconds, formatTime };
