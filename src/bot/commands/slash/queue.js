/**
 * Queue Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)),
    cooldown: 3,

    async execute(interaction, bot) {
        const queue = bot.queues.get(interaction.guild.id);
        
        if (!queue || queue.tracks.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription('📋 The queue is empty!')]
            });
        }

        const page = interaction.options.getInteger('page') || 1;
        const embed = queue.createQueueEmbed(page, 10);
        
        return interaction.reply({ embeds: [embed] });
    }
};
