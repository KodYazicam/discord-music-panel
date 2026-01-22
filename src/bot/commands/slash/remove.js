/**
 * Remove Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Track position in queue')
                .setRequired(true)
                .setMinValue(1)),
    cooldown: 2,

    async execute(interaction, bot) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ You must be in a voice channel!')],
                ephemeral: true
            });
        }

        const index = interaction.options.getInteger('position') - 1;
        const result = bot.removeTrack(interaction.guild.id, index);
        
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(result.success ? 0x57F287 : 0xED4245)
                .setDescription(result.success ? `🗑️ Removed track #${index + 1}` : `❌ ${result.message}`)]
        });
    }
};
