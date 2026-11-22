/**
 * Now Playing Command - Show current track info
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'nowplaying',
    aliases: ['np', 'now', 'current', 'simdiki', 'playing'],
    description: 'Show the currently playing track',
    usage: '',
    cooldown: 3,

    async execute(message, args, bot) {
        const queue = bot.queues.get(message.guild.id);
        
        if (!queue || !queue.currentTrack) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setDescription('🎵 Nothing is playing right now!')
                ]
            });
        }

        const track = queue.currentTrack;
        const rawPosition = queue.getPosition();
        const duration = track.duration || 0;
        // The position is wall-clock based, so buffering or a stream that runs
        // longer than its metadata can put it at or past the advertised
        // duration. Clamp the label and the bar instead of asking
        // String#repeat for a negative count.
        const position = duration > 0
            ? Math.min(Math.max(rawPosition, 0), duration)
            : Math.max(rawPosition, 0);

        // Create progress bar
        const progressBarLength = 20;
        const progress = duration > 0
            ? Math.min(progressBarLength - 1, Math.floor((position / duration) * progressBarLength))
            : 0;
        const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(progressBarLength - progress - 1);
        
        // Format times
        const formatTime = (seconds) => {
            const total = Math.max(0, Math.floor(seconds));
            const mins = Math.floor(total / 60);
            const secs = total % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Now Playing')
            .setDescription(`[${track.title}](${track.url})`)
            .addFields(
                { name: 'Artist', value: track.author || 'Unknown', inline: true },
                { name: 'Duration', value: track.durationFormatted || 'Unknown', inline: true },
                { name: 'Source', value: track.source === 'youtube' ? '🔴 YouTube' : '🟠 SoundCloud', inline: true }
            )
            .addFields({
                name: 'Progress',
                value: `\`${formatTime(position)}\` ${progressBar} \`${formatTime(duration)}\``
            })
            .setTimestamp();

        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }

        // Add status indicators
        let status = [];
        if (queue.isPaused) status.push('⏸️ Paused');
        if (queue.loop) status.push('🔂 Loop Track');
        if (queue.loopQueue) status.push('🔁 Loop Queue');
        status.push(`🔊 ${queue.volume}%`);
        
        embed.setFooter({ text: status.join(' • ') });

        return message.reply({ embeds: [embed] });
    }
};
