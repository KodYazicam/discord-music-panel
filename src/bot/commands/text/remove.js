/**
 * Remove Command - Remove a track from queue
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'remove',
    aliases: ['rm', 'sil', 'kaldir', 'delete'],
    description: 'Remove a track from the queue',
    usage: '<track number>',
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

        if (!args.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please specify a track number!')
                        .addFields({ name: 'Usage', value: `\`${bot.getPrefix(message.guild.id)}remove <number>\`` })
                ]
            });
        }

        const index = parseInt(args[0]) - 1; // Convert to 0-based index
        
        if (isNaN(index) || index < 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please provide a valid track number!')
                ]
            });
        }

        const result = bot.removeTrack(message.guild.id, index);

        if (result.success) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(`🗑️ Removed track #${index + 1}`)
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
