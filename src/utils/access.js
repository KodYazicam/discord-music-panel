const { botOperations, userOperations } = require('../database/db');

function isAdmin(user) {
    return user?.role === 'admin';
}

/**
 * Resolve the live account behind a verified JWT.
 *
 * A token proves who signed in; it does not prove the account still exists or
 * still holds the role stored in its claims. Re-read the row so deleting or
 * demoting a user takes effect immediately instead of waiting up to 24 hours
 * for the token to expire.
 */
function resolveSessionUser(claims) {
    if (!claims || claims.id === undefined || claims.id === null) return null;
    const user = userOperations.getById(claims.id);
    if (!user) return null;
    return { id: user.id, username: user.username, role: user.role };
}

function canManageBot(user, bot) {
    if (!user || !bot) return false;
    if (isAdmin(user)) return true;
    return Number(bot.created_by) === Number(user.id);
}

function requireBotAccess(req, botId) {
    const bot = botOperations.getById(botId);
    if (!bot) return { error: 'Bot not found', status: 404 };
    if (!canManageBot(req.user, bot)) return { error: 'Forbidden', status: 403 };
    return { bot };
}

module.exports = { isAdmin, canManageBot, requireBotAccess, resolveSessionUser };
