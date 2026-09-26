/**
 * Seek Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { parseTimeToSeconds, formatTime } = require('../../../utils/time');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a position in the current track')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Position to seek to, e.g. 90 or 1:30 or 1:30:15')
                .setRequired(true)),
    cooldown: 3,

    async execute(interaction, bot) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ You must be in a voice channel!')],
                ephemeral: true
            });
        }

        const raw = interaction.options.getString('time');
        const seconds = parseTimeToSeconds(raw);

        if (seconds === null) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Invalid time format! Use `90`, `1:30`, or `1:30:15`.')],
                ephemeral: true
            });
        }

        const result = bot.seek(interaction.guild.id, seconds);

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(result.success ? 0x57F287 : 0xED4245)
                .setDescription(result.success ? `⏩ Seeked to ${formatTime(seconds)}` : `❌ ${result.message}`)]
        });
    }
};
