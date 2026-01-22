/**
 * Pause Command - Pause the current track
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'pause',
    aliases: ['duraklat', 'durdur'],
    description: 'Pause the currently playing track',
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

        const result = bot.pause(message.guild.id);

        if (result.success) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription('⏸️ Paused the music')
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
