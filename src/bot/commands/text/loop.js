/**
 * Loop Command - Toggle loop modes
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'loop',
    aliases: ['tekrar', 'repeat', 'dongu'],
    description: 'Toggle loop mode (off/track/queue)',
    usage: '[off|track|queue]',
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
        if (!queue) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ No active queue!')
                ]
            });
        }

        // Determine mode
        let mode;
        if (args.length === 0) {
            // Cycle through modes: off -> track -> queue -> off
            if (!queue.loop && !queue.loopQueue) mode = 'track';
            else if (queue.loop) mode = 'queue';
            else mode = 'off';
        } else {
            mode = args[0].toLowerCase();
            if (!['off', 'track', 'queue', 'song', 'single', 'all'].includes(mode)) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xED4245)
                            .setDescription('❌ Invalid mode! Use: `off`, `track`, or `queue`')
                    ]
                });
            }
            // Normalize modes
            if (mode === 'song' || mode === 'single') mode = 'track';
            if (mode === 'all') mode = 'queue';
        }

        const result = bot.setLoop(message.guild.id, mode);

        if (result.success) {
            let emoji, text;
            switch (mode) {
                case 'off':
                    emoji = '➡️';
                    text = 'Loop disabled';
                    break;
                case 'track':
                    emoji = '🔂';
                    text = 'Looping current track';
                    break;
                case 'queue':
                    emoji = '🔁';
                    text = 'Looping entire queue';
                    break;
            }
            
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(`${emoji} ${text}`)
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
