/**
 * Queue Command - Display the music queue
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'queue',
    aliases: ['q', 'sira', 'kuyruk', 'list'],
    description: 'Display the music queue',
    usage: '[page]',
    cooldown: 3,

    async execute(message, args, bot) {
        const queue = bot.queues.get(message.guild.id);
        
        if (!queue || queue.tracks.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setDescription('📋 The queue is empty!')
                ]
            });
        }

        const page = parseInt(args[0]) || 1;
        const pageSize = 10;
        const totalPages = Math.ceil(queue.tracks.length / pageSize);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        
        const embed = queue.createQueueEmbed(currentPage, pageSize);
        
        // Add navigation buttons if multiple pages
        if (totalPages > 1) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`queue_prev_${currentPage}`)
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`queue_next_${currentPage}`)
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );
            
            return message.reply({ embeds: [embed], components: [row] });
        }
        
        return message.reply({ embeds: [embed] });
    }
};
