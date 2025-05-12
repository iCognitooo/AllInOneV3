const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { colors } = require("../../config.json")
const { getUserTickets } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder().setName("my-tickets").setDescription("Muestra tus tickets abiertos y cerrados"),
  cooldown: 10,
  async execute(interaction) {
    try {
      // Obtener tickets abiertos del usuario
      const openTickets = await getUserTickets(interaction.user.id, interaction.guild.id, "open")

      // Obtener tickets cerrados del usuario
      const closedTickets = await getUserTickets(interaction.user.id, interaction.guild.id, "closed")

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle("🎫 Mis Tickets")
        .setDescription(`Tickets de ${interaction.user.tag}`)
        .setColor(colors.primary)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Añadir tickets abiertos
      if (openTickets.length > 0) {
        let openText = ""
        for (const ticket of openTickets) {
          openText += `<#${ticket.channel_id}> - Creado: <t:${Math.floor(new Date(ticket.created_at).getTime() / 1000)}:R>\n`
        }
        embed.addFields({ name: `Tickets Abiertos (${openTickets.length})`, value: openText })
      } else {
        embed.addFields({ name: "Tickets Abiertos (0)", value: "No tienes tickets abiertos." })
      }

      // Añadir tickets cerrados (limitados a 5)
      if (closedTickets.length > 0) {
        let closedText = ""
        const displayTickets = closedTickets.slice(0, 5)
        for (const ticket of displayTickets) {
          closedText += `Ticket #${ticket.id} - Cerrado: <t:${Math.floor(new Date(ticket.closed_at).getTime() / 1000)}:R>\n`
        }

        if (closedTickets.length > 5) {
          closedText += `\n*Y ${closedTickets.length - 5} más...*`
        }

        embed.addFields({ name: `Tickets Cerrados (${closedTickets.length})`, value: closedText })
      } else {
        embed.addFields({ name: "Tickets Cerrados (0)", value: "No tienes tickets cerrados." })
      }

      // Botón para crear nuevo ticket
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create-ticket:general")
          .setLabel("Crear Nuevo Ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎫"),
      )

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
    } catch (error) {
      console.error("Error al obtener tickets del usuario:", error)
      await interaction.reply({
        content: "Hubo un error al obtener tus tickets.",
        ephemeral: true,
      })
    }
  },
}
