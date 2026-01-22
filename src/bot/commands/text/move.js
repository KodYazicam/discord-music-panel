/**
 * Move Command - Move a track to a different position
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'move',
    aliases: ['mv', 'tasi'],
    description: 'Move a track to a different position in the queue',
    usage: '<from> <to>',
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

        if (args.length < 2) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please specify the track positions!')
                        .addFields({ name: 'Usage', value: `\`${bot.getPrefix(message.guild.id)}move <from> <to>\`` })
                ]
            });
        }

        const from = parseInt(args[0]) - 1; // Convert to 0-based
        const to = parseInt(args[1]) - 1;
        
        if (isNaN(from) || isNaN(to) || from < 0 || to < 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please provide valid track numbers!')
                ]
            });
        }

        const result = bot.moveTrack(message.guild.id, from, to);

        if (result.success) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(`📦 Moved track from position ${from + 1} to ${to + 1}`)
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
