/**
 * Caller-scoped statistics shared by the REST and Socket.IO boundaries.
 *
 * The in-memory counters come from the bot list the caller may already read
 * (`BotManager.getAllBots()` filtered by ownership), and the persisted totals
 * come from `statisticsOperations.getTotalsForBots()` with the same bot ids.
 * Nothing here reads a global aggregate, so one operator's usage can never
 * leak into another operator's response.
 */
const { statisticsOperations } = require('../database/db');

function collectScopedStats(bots) {
    const list = Array.isArray(bots) ? bots : [];
    const totals = {
        runningBots: 0,
        totalBots: list.length,
        totalGuilds: 0,
        totalPlaying: 0,
        totalQueued: 0,
        totalUsers: 0
    };

    for (const bot of list) {
        if (!bot || bot.status !== 'online') continue;
        totals.runningBots += 1;
        totals.totalGuilds += Number(bot.guildCount) || 0;
        totals.totalPlaying += Number(bot.playingCount) || 0;
        totals.totalQueued += Number(bot.totalQueuedSongs) || 0;
        totals.totalUsers += Number(bot.totalUsers) || 0;
    }

    const botIds = list
        .map((bot) => bot?.id)
        .filter((id) => id !== undefined && id !== null);
    const dbTotals = statisticsOperations.getTotalsForBots(botIds) || {};

    return {
        ...totals,
        total_bots: Number(dbTotals.total_bots) || 0,
        total_songs: Number(dbTotals.total_songs) || 0,
        total_playtime: Number(dbTotals.total_playtime) || 0,
        total_commands: Number(dbTotals.total_commands) || 0
    };
}

module.exports = { collectScopedStats };
