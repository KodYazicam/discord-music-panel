/**
 * Search Command - Search for tracks and select one
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const ytdlp = require('../../ytdlp');

module.exports = {
    name: 'search',
    aliases: ['ara', 'find', 'bul'],
    description: 'Search for tracks and select one to play',
    usage: '<query>',
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

        if (!args.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please provide a search query!')
                        .addFields({ name: 'Usage', value: `\`${bot.getPrefix(message.guild.id)}search <query>\`` })
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
            // Search for tracks
            const results = await ytdlp.resolveQuery(query, 10);

            if (!results || results.length === 0) {
                return loadingMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xED4245)
                            .setDescription('❌ No results found!')
                    ]
                });
            }

            // Create embed with results
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔍 Search Results')
                .setDescription(
                    results.map((track, i) => 
                        `**${i + 1}.** [${track.title}](${track.url}) - ${track.durationFormatted}`
                    ).join('\n')
                )
                .setFooter({ text: 'Select a track from the menu below' });

            // Create select menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`search_select_${message.author.id}`)
                .setPlaceholder('Select a track')
                .addOptions(
                    results.map((track, i) => ({
                        label: track.title.slice(0, 100),
                        description: `${track.durationFormatted} - ${track.author || 'Unknown'}`.slice(0, 100),
                        value: track.url
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await loadingMsg.edit({ embeds: [embed], components: [row] });

            // Wait for selection
            try {
                const collector = response.createMessageComponentCollector({
                    filter: (i) => i.user.id === message.author.id,
                    time: 30000,
                    max: 1
                });

                collector.on('collect', async (interaction) => {
                    const selectedUrl = interaction.values[0];
                    
                    await interaction.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x5865F2)
                                .setDescription('🎵 Adding to queue...')
                        ],
                        components: []
                    });

                    // Play the selected track
                    const result = await bot.play(
                        message.guild.id,
                        selectedUrl,
                        voiceChannel.id,
                        message.channel.id
                    );

                    if (result.success && result.tracks.length > 0) {
                        const track = result.tracks[0];
                        await response.edit({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0x57F287)
                                    .setTitle('🎵 Added to Queue')
                                    .setDescription(`[${track.title}](${track.url})`)
                                    .setThumbnail(track.thumbnail)
                                    .setFooter({ text: `Requested by ${message.author.tag}` })
                            ],
                            components: []
                        });
                    } else {
                        await response.edit({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0xED4245)
                                    .setDescription(`❌ ${result.message}`)
                            ],
                            components: []
                        });
                    }
                });

                collector.on('end', (collected) => {
                    if (collected.size === 0) {
                        response.edit({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0xFEE75C)
                                    .setDescription('⏱️ Search timed out')
                            ],
                            components: []
                        }).catch(() => {});
                    }
                });

            } catch (error) {
                // Interaction failed
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
