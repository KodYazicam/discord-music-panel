/**
 * Skip Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the currently playing track'),
    cooldown: 2,

    async execute(interaction, bot) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ You must be in a voice channel!')],
                ephemeral: true
            });
        }

        const queue = bot.getQueue(interaction.guild.id);
        const currentTrack = queue?.currentTrack;
        const result = bot.skip(interaction.guild.id);
        
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(result.success ? 0x57F287 : 0xED4245)
                .setDescription(result.success ? `⏭️ Skipped **${currentTrack?.title || 'the track'}**` : `❌ ${result.message}`)]
        });
    }
};
