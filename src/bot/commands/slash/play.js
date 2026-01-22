/**
 * Play Slash Command - Play a song or add to queue
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or add it to the queue')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL (YouTube, Spotify, SoundCloud)')
                .setRequired(true)),
    cooldown: 3,

    async execute(interaction, bot) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You must be in a voice channel to use this command!')
                ],
                ephemeral: true
            });
        }

        const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ I need permission to join and speak in your voice channel!')
                ],
                ephemeral: true
            });
        }

        const query = interaction.options.getString('query');

        await interaction.deferReply();

        try {
            const result = await bot.play(
                interaction.guild.id,
                query,
                voiceChannel.id,
                interaction.channel.id
            );

            if (result.success) {
                const tracks = result.tracks;
                
                if (tracks.length === 1) {
                    const track = tracks[0];
                    await interaction.editReply({
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
                                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                                .setTimestamp()
                        ]
                    });
                } else {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle('📋 Playlist Added')
                                .setDescription(`Added **${tracks.length}** tracks to the queue`)
                                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                                .setTimestamp()
                        ]
                    });
                }
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xED4245)
                            .setDescription(`❌ ${result.message}`)
                    ]
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`❌ An error occurred: ${error.message}`)
                ]
            });
        }
    }
};
