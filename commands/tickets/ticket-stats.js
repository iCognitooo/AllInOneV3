const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")
const { getGuildTickets } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-stats")
    .setDescription("Muestra estadísticas de tickets del servidor"),
  cooldown: 10,
  async execute(interaction) {
    try {
      // Obtener tickets abiertos
      const openTickets = await getGuildTickets(interaction.guild.id, "open")

      // Obtener tickets cerrados
      const closedTickets = await getGuildTickets(interaction.guild.id, "closed")

      // Obtener estadísticas por tipo
      const { pool } = require("../../utils/database")
      const [typeStats] = await pool.execute(
        "SELECT type, COUNT(*) as count FROM tickets WHERE guild_id = ? GROUP BY type ORDER BY count DESC",
        [interaction.guild.id],
      )

      // Obtener usuarios con más tickets
      const [userStats] = await pool.execute(
        "SELECT creator, COUNT(*) as count FROM tickets WHERE guild_id = ? GROUP BY creator ORDER BY count DESC LIMIT 5",
        [interaction.guild.id],
      )

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle("📊 Estadísticas de Tickets")
        .setDescription(`Estadísticas del sistema de tickets para ${interaction.guild.name}`)
        .addFields(
          { name: "Tickets Totales", value: `${openTickets.length + closedTickets.length}`, inline: true },
          { name: "Tickets Abiertos", value: `${openTickets.length}`, inline: true },
          { name: "Tickets Cerrados", value: `${closedTickets.length}`, inline: true },
        )
        .setColor(colors.primary)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Añadir estadísticas por tipo
      if (typeStats.length > 0) {
        let typeText = ""
        for (const stat of typeStats) {
          const typeName = stat.type.charAt(0).toUpperCase() + stat.type.slice(1)
          typeText += `${typeName}: ${stat.count}\n`
        }
        embed.addFields({ name: "Tickets por Tipo", value: typeText })
      }

      // Añadir usuarios con más tickets
      if (userStats.length > 0) {
        let userText = ""
        for (const stat of userStats) {
          try {
            const user = await interaction.client.users.fetch(stat.creator)
            userText += `${user.tag}: ${stat.count}\n`
          } catch {
            userText += `ID ${stat.creator}: ${stat.count}\n`
          }
        }
        embed.addFields({ name: "Usuarios con más Tickets", value: userText })
      }

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      console.error("Error al obtener estadísticas de tickets:", error)
      await interaction.reply({
        content: "Hubo un error al obtener las estadísticas de tickets.",
        ephemeral: true,
      })
    }
  },
}
