const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Events, PermissionFlagsBits } = require('discord.js');

// Replace the database module before MusicBot is loaded so these tests never
// touch SQLite or the on-disk database.
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        guildOperations: { getSettings: () => null, upsert: () => {}, remove: () => {} },
        statisticsOperations: { increment: () => {} },
        logOperations: { add: () => {} }
    }
};

const { MusicBot } = require('../src/bot/MusicBot');
const { canUseCommand } = require('../src/bot/command-permissions');

const flush = () => new Promise(resolve => setImmediate(resolve));
const guild = { id: 'guild-1', ownerId: 'owner-1' };
const djSettings = { djEnabled: true, djRoleId: 'dj-role-1', djOnlyCommands: ['skip', 'stop'] };

function createMember(id, roles = [], administrator = false) {
    return {
        id,
        roles: { cache: new Map(roles.map(roleId => [roleId, { id: roleId }])) },
        permissions: { has: flag => administrator && flag === PermissionFlagsBits.Administrator }
    };
}

function createBot(t, overrides = {}) {
    const bot = new MusicBot({
        id: 'bot-1',
        name: 'Test Bot',
        prefix: '!',
        prefixType: 'both',
        volume: 100,
        ...overrides
    }, null, null);
    t.after(() => bot.client.destroy());
    return bot;
}

function createMessage(member, content = '!skip') {
    const replies = [];
    return {
        replies,
        value: {
            author: { bot: false, id: member.id },
            guild,
            channelId: 'channel-1',
            channel: { id: 'channel-1' },
            member,
            content,
            deletable: false,
            reply: async payload => (replies.push(payload), payload)
        }
    };
}

function createInteraction(member) {
    const replies = [];
    return {
        replies,
        value: {
            isChatInputCommand: () => true,
            commandName: 'skip',
            user: { id: member.id },
            guild,
            guildId: 'guild-1',
            channelId: 'channel-1',
            member,
            replied: false,
            deferred: false,
            reply: async payload => (replies.push(payload), payload),
            followUp: async payload => (replies.push(payload), payload)
        }
    };
}

test('prefix and slash DJ Mode deny a member without the DJ role', async t => {
    const bot = createBot(t, djSettings);
    const executed = [];
    bot.commands.set('skip', { name: 'skip', execute: async () => executed.push('text') });
    bot.slashCommands.set('skip', { data: { name: 'skip' }, execute: async () => executed.push('slash') });
    const member = createMember('user-1');
    const text = createMessage(member);
    const slash = createInteraction(member);

    bot.client.emit(Events.MessageCreate, text.value);
    bot.client.emit(Events.InteractionCreate, slash.value);
    await flush();

    assert.deepEqual(executed, []);
    assert.match(text.replies[0], /DJ Mode/i);
    assert.equal(slash.replies[0].ephemeral, true);
    assert.match(slash.replies[0].content, /DJ Mode/i);
});

test('DJ Mode allows the DJ role on both command paths', async t => {
    const bot = createBot(t, djSettings);
    const executed = [];
    bot.commands.set('skip', { name: 'skip', execute: async () => executed.push('text') });
    bot.slashCommands.set('skip', { data: { name: 'skip' }, execute: async () => executed.push('slash') });
    const dj = createMember('user-1', ['dj-role-1']);

    bot.client.emit(Events.MessageCreate, createMessage(dj).value);
    bot.client.emit(Events.InteractionCreate, createInteraction(dj).value);
    await flush();

    assert.deepEqual(executed, ['text', 'slash']);
});

test('a settings update applies DJ Mode to a running bot', async t => {
    const bot = createBot(t);
    const executed = [];
    bot.commands.set('skip', { name: 'skip', execute: async () => executed.push('skip') });
    bot.updateConfig({ settings: djSettings });
    const { value, replies } = createMessage(createMember('user-1'));

    bot.client.emit(Events.MessageCreate, value);
    await flush();

    assert.deepEqual(executed, []);
    assert.match(replies[0], /DJ Mode/i);
});

const deniedCases = [
    ['blocked users', { blockedUsers: ['user-1'] }, 'play', 'user-blocked'],
    ['blocked channels', { blockedChannels: ['channel-1'] }, 'play', 'channel-blocked'],
    ['channels outside the allowed list', { allowedChannels: ['channel-2'] }, 'play', 'channel-not-allowed'],
    ['members without an allowed role', { allowedRoles: ['role-1'] }, 'play', 'role-not-allowed'],
    ['DJ Mode without a configured role', { djEnabled: true, djOnlyCommands: ['skip'] }, 'skip', 'dj-role-missing'],
    ['DJ Mode without the DJ role', { djEnabled: true, djRoleId: 'dj-role-1', djOnlyCommands: ['skip'] }, 'skip', 'dj-role-required']
];

for (const [name, settings, commandName, reason] of deniedCases) {
    test(`canUseCommand denies ${name}`, () => {
        const result = canUseCommand({ member: createMember('user-1'), guild, channelId: 'channel-1', commandName, settings });
        assert.equal(result.allowed, false);
        assert.equal(result.reason, reason);
    });
}

test('canUseCommand allows the DJ role, administrators, the guild owner, and unrestricted commands', () => {
    const call = (member, commandName = 'skip', settings = djSettings) =>
        canUseCommand({ member, guild, channelId: 'channel-1', commandName, settings });

    assert.equal(call(createMember('user-1', ['dj-role-1'])).allowed, true);
    assert.equal(call(createMember('admin-1', [], true)).allowed, true);
    assert.equal(call(createMember('owner-1')).allowed, true);
    assert.equal(call(createMember('user-1'), 'play').allowed, true);
    assert.equal(call(createMember('user-1'), 'skip', {}).allowed, true);
});
