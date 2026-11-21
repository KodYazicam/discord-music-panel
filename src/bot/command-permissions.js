/**
 * Command permissions - DJ Mode and channel/role/user restrictions.
 *
 * The dashboard stores these settings on the bot (extra_settings), but before
 * this module nothing read them on the command path. Keep the normalisation in
 * one place so a running bot picks up dashboard changes immediately.
 */

const { PermissionFlagsBits } = require('discord.js');

const COMMAND_SETTING_KEYS = [
    'djEnabled', 'djRoleId', 'djOnlyCommands', 'allowedChannels',
    'blockedChannels', 'allowedRoles', 'blockedUsers'
];

function toIdList(value) {
    if (!Array.isArray(value)) return [];
    const ids = value
        .filter(entry => typeof entry === 'string' || typeof entry === 'number')
        .map(entry => String(entry).trim())
        .filter(Boolean);
    return [...new Set(ids)];
}

function normalizeCommandSettings(settings = {}) {
    const djRoleId = typeof settings.djRoleId === 'string' ? settings.djRoleId.trim() : '';
    return {
        djEnabled: settings.djEnabled === true || settings.djEnabled === 1,
        djRoleId: djRoleId || null,
        djOnlyCommands: toIdList(settings.djOnlyCommands).map(name => name.toLowerCase()),
        allowedChannels: toIdList(settings.allowedChannels),
        blockedChannels: toIdList(settings.blockedChannels),
        allowedRoles: toIdList(settings.allowedRoles),
        blockedUsers: toIdList(settings.blockedUsers)
    };
}

function memberRoleIds(member) {
    if (!member) return [];
    const cache = member.roles?.cache;
    if (cache && typeof cache.keys === 'function') return [...cache.keys()];
    if (Array.isArray(member.roles)) return member.roles;
    return Array.isArray(member._roles) ? member._roles : [];
}

function isAdministrator(member) {
    const permissions = member?.permissions;
    if (!permissions) return false;
    if (typeof permissions.has === 'function') {
        try { return permissions.has(PermissionFlagsBits.Administrator); } catch { return false; }
    }
    try {
        const bits = BigInt(permissions);
        return (bits & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator;
    } catch {
        return false;
    }
}

function isGuildOwner(member, guild) {
    const ownerId = guild?.ownerId || member?.guild?.ownerId;
    return Boolean(member?.id && ownerId && member.id === ownerId);
}

const deny = (reason, message) => ({ allowed: false, reason, message });

/**
 * Decide whether a member may run a command. Restrictions apply to everyone.
 * DJ Mode restricts djOnlyCommands to the DJ role; administrators and the guild
 * owner stay exempt so a server cannot lock itself out.
 */
function canUseCommand({ member, guild, channelId, commandName, settings = {} }) {
    const s = normalizeCommandSettings(settings);
    const userId = member?.id ? String(member.id) : null;
    const channel = channelId ? String(channelId) : null;

    if (userId && s.blockedUsers.includes(userId)) return deny('user-blocked', 'You are blocked from using commands on this bot.');
    if (channel && s.blockedChannels.includes(channel)) return deny('channel-blocked', 'Bot commands are blocked in this channel.');
    if (s.allowedChannels.length > 0 && (!channel || !s.allowedChannels.includes(channel))) {
        return deny('channel-not-allowed', 'Bot commands are not allowed in this channel.');
    }
    if (s.allowedRoles.length > 0 && !s.allowedRoles.some(id => memberRoleIds(member).includes(id))) {
        return deny('role-not-allowed', 'You do not have a role that is allowed to use bot commands.');
    }

    const command = String(commandName || '').toLowerCase();
    if (s.djEnabled && s.djOnlyCommands.includes(command) && !isAdministrator(member) && !isGuildOwner(member, guild)) {
        if (!s.djRoleId) return deny('dj-role-missing', 'DJ Mode is enabled but no DJ role is configured. Ask a server administrator to set one.');
        if (!memberRoleIds(member).includes(s.djRoleId)) {
            return deny('dj-role-required', `DJ Mode is enabled: only members with <@&${s.djRoleId}> can use \`${command}\`.`);
        }
    }

    return { allowed: true };
}

module.exports = { COMMAND_SETTING_KEYS, normalizeCommandSettings, canUseCommand };
