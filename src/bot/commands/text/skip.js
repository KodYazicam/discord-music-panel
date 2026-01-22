/**
 * Skip Command - Skip the current track
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'skip',
    aliases: ['s', 'atla', 'next', 'sonraki'],
    description: 'Skip the currently playing track',
    usage: '',
    cooldown: 2,

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

        const queue = bot.getQueue(message.guild.id);
        const currentTrack = queue?.currentTrack;

        const result = bot.skip(message.guild.id);

        if (result.success) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(`⏭️ Skipped **${currentTrack?.title || 'the track'}**`)
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
