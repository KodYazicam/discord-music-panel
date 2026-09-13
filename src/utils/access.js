const { botOperations } = require('../database/db');

function isAdmin(user) {
    return user?.role === 'admin';
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

module.exports = { isAdmin, canManageBot, requireBotAccess };
