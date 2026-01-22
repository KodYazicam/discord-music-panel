/**
 * Play Command - Play a song or add to queue
 * Supports YouTube, Spotify, SoundCloud URLs and search queries
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'play',
    aliases: ['p', 'oynat', 'çal'],
    description: 'Play a song or add it to the queue',
    usage: '<song name or URL>',
    examples: ['play never gonna give you up', 'play https://youtube.com/watch?v=...', 'p lofi beats'],
    cooldown: 3,

    async execute(message, args, bot) {
        // Check if user is in a voice channel
        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You must be in a voice channel to use this command!')
                ]
            });
        }

        // Check for query
        if (!args.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please provide a song name or URL!')
                        .addFields({ name: 'Usage', value: `\`${bot.getPrefix(message.guild.id)}play <song name or URL>\`` })
                ]
            });
        }

        // Check bot permissions
        const permissions = voiceChannel.permissionsFor(message.guild.members.me);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ I need permission to join and speak in your voice channel!')
                ]
            });
        }

        const query = args.join(' ');

        // Send loading message
        const loadingMsg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setDescription('🔍 Searching...')
            ]
        });

        try {
            const result = await bot.play(
                message.guild.id,
                query,
                voiceChannel.id,
                message.channel.id
            );

            if (result.success) {
                const tracks = result.tracks;
                
                if (tracks.length === 1) {
                    const track = tracks[0];
                    await loadingMsg.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle('🎵 Added to Queue')
                                .setDescription(`[${track.title}](${track.url})`)
                                .addFields(
                                    { name: 'Duration', value: track.durationFormatted || 'Unknown', inline: true },
                                    { name: 'Artist', value: track.author || 'Unknown', inline: true }
                                )
                                .setThumbnail(track.thumbnail)
                                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                                .setTimestamp()
                        ]
                    });
                } else {
                    await loadingMsg.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle('📋 Playlist Added')
                                .setDescription(`Added **${tracks.length}** tracks to the queue`)
                                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                                .setTimestamp()
                        ]
                    });
                }
            } else {
                await loadingMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xED4245)
                            .setDescription(`❌ ${result.message}`)
                    ]
                });
            }
        } catch (error) {
            await loadingMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`❌ An error occurred: ${error.message}`)
                ]
            });
        }
    }
};
