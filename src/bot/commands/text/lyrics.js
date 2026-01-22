/**
 * Lyrics Command - Get lyrics for the current or specified song
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lyrics',
    aliases: ['sarki', 'sozu', 'lyric'],
    description: 'Get lyrics for the current or specified song',
    usage: '[song name]',
    cooldown: 5,

    async execute(message, args, bot) {
        const queue = bot.queues.get(message.guild.id);
        let searchQuery;

        if (args.length) {
            searchQuery = args.join(' ');
        } else if (queue?.currentTrack) {
            searchQuery = queue.currentTrack.title;
        } else {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please specify a song name or play something first!')
                ]
            });
        }

        const loadingMsg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setDescription('🔍 Searching for lyrics...')
            ]
        });

        try {
            // Note: For actual lyrics, you'd need a lyrics API like Genius
            // This is a placeholder implementation
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`📝 Lyrics: ${searchQuery}`)
                .setDescription(
                    '⚠️ Lyrics feature requires integration with a lyrics API (like Genius).\n\n' +
                    'To enable lyrics:\n' +
                    '1. Get an API key from [Genius](https://genius.com/api-clients)\n' +
                    '2. Add `GENIUS_API_KEY` to your `.env` file\n' +
                    '3. Install `genius-lyrics` package'
                )
                .setFooter({ text: 'Tip: You can search for lyrics manually on genius.com' });

            await loadingMsg.edit({ embeds: [embed] });

        } catch (error) {
            await loadingMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`❌ Could not find lyrics: ${error.message}`)
                ]
            });
        }
    }
};
