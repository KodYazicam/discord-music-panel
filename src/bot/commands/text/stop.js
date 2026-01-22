/**
 * Stop Command - Stop playback and clear queue
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'stop',
    aliases: ['dur', 'bitir'],
    description: 'Stop the music and clear the queue',
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

        const result = bot.stopPlayback(message.guild.id);

        if (result.success) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription('⏹️ Stopped the music and cleared the queue')
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
