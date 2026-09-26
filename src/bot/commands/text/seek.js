/**
 * Seek Command - Seek to a position in the current track
 */

const { EmbedBuilder } = require('discord.js');
const { parseTimeToSeconds, formatTime } = require('../../../utils/time');

module.exports = {
    name: 'seek',
    aliases: ['git', 'zaman'],
    description: 'Seek to a position in the current track',
    usage: '<time>',
    examples: ['seek 1:30', 'seek 90'],
    cooldown: 3,

    async execute(message, args, bot) {
        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You must be in a voice channel!')
                ]
            });
        }

        if (!args.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please specify a time!')
                        .addFields({ name: 'Usage', value: `\`${bot.getPrefix(message.guild.id)}seek <time>\`\nFormat: \`1:30\` or \`90\` (seconds)` })
                ]
            });
        }

        const seconds = parseTimeToSeconds(args[0]);

        if (seconds === null) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Invalid time format!')
                ]
            });
        }

        const result = bot.seek(message.guild.id, seconds);

        if (result.success) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(`⏩ Seeked to ${formatTime(seconds)}`)
                ]
            });
        } else {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`❌ ${result.message}`)
                ]
            });
        }
    }
};
