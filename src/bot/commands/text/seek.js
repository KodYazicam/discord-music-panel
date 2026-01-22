/**
 * Seek Command - Seek to a position in the current track
 */

const { EmbedBuilder } = require('discord.js');

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

        // Parse time
        let seconds = 0;
        const timeStr = args[0];
        
        if (timeStr.includes(':')) {
            const parts = timeStr.split(':').map(p => parseInt(p));
            if (parts.length === 2) {
                seconds = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
                seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        } else {
            seconds = parseInt(timeStr);
        }

        if (isNaN(seconds) || seconds < 0) {
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
            const formatTime = (s) => {
                const mins = Math.floor(s / 60);
                const secs = s % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            
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
