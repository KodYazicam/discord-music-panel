/**
 * Jump Command - Jump to a specific track in the queue
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'jump',
    aliases: ['goto', 'atla', 'git'],
    description: 'Jump to a specific track in the queue',
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
                        .addFields({ name: 'Usage', value: `\`${bot.getPrefix(message.guild.id)}jump <number>\`` })
                ]
            });
        }

        const index = parseInt(args[0]) - 1;
        
        if (isNaN(index) || index < 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please provide a valid track number!')
                ]
            });
        }

        const result = bot.jumpTo(message.guild.id, index);

        if (result.success) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(`⏭️ Jumped to track #${index + 1}`)
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
