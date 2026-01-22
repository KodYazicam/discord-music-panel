/**
 * Volume Command - Adjust playback volume
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'volume',
    aliases: ['vol', 'ses', 'v'],
    description: 'Adjust the playback volume (0-200)',
    usage: '<0-200>',
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

        const queue = bot.queues.get(message.guild.id);
        
        // Show current volume if no args
        if (!args.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setDescription(`🔊 Current volume: **${queue?.volume || 100}%**`)
                ]
            });
        }

        const volume = parseInt(args[0]);
        
        if (isNaN(volume) || volume < 0 || volume > 200) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please provide a number between 0 and 200!')
                ]
            });
        }

        const result = bot.setVolume(message.guild.id, volume);

        if (result.success) {
            let emoji = '🔊';
            if (volume === 0) emoji = '🔇';
            else if (volume < 50) emoji = '🔈';
            else if (volume < 100) emoji = '🔉';
            
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(`${emoji} Volume set to **${volume}%**`)
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
