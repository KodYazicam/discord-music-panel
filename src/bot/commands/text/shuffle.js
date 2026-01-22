/**
 * Shuffle Command - Shuffle the queue
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'shuffle',
    aliases: ['karistir', 'mix', 'random'],
    description: 'Shuffle the queue',
    usage: '',
    cooldown: 5,

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

        const result = bot.shuffle(message.guild.id);

        if (result.success) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription('🔀 Queue shuffled!')
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
