/**
 * Volume Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the playback volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-200)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(200)),
    cooldown: 2,

    async execute(interaction, bot) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ You must be in a voice channel!')],
                ephemeral: true
            });
        }

        const queue = bot.queues.get(interaction.guild.id);
        const volume = interaction.options.getInteger('level');

        if (volume === null) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`🔊 Current volume: **${queue?.volume || 100}%**`)]
            });
        }

        const result = bot.setVolume(interaction.guild.id, volume);
        let emoji = '🔊';
        if (volume === 0) emoji = '🔇';
        else if (volume < 50) emoji = '🔈';
        else if (volume < 100) emoji = '🔉';
        
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(result.success ? 0x57F287 : 0xED4245)
                .setDescription(result.success ? `${emoji} Volume set to **${volume}%**` : `❌ ${result.message}`)]
        });
    }
};
