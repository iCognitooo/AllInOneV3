const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "giveaway:",
  async execute(interaction) {
    try {
      // Extraer ID del sorteo del customId (giveaway:id)
      const giveawayId = interaction.customId.split(":")[1]

      // Verificar si el sorteo existe y está activo
      const { pool } = require("../utils/database")
      const [giveaways] = await pool.execute("SELECT * FROM giveaways WHERE id = ? AND ended = 0", [giveawayId])

      if (giveaways.length === 0) {
        return interaction.reply({
          content: "Este sorteo ya ha finalizado o no existe.",
          ephemeral: true,
        })
      }

      // Verificar si el usuario ya está participando
      const [entries] = await pool.execute("SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?", [
        giveawayId,
        interaction.user.id,
      ])

      if (entries.length > 0) {
        // El usuario ya está participando, eliminar entrada
        await pool.execute("DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?", [
          giveawayId,
          interaction.user.id,
        ])

        return interaction.reply({
          content: "Has cancelado tu participación en este sorteo.",
          ephemeral: true,
        })
      }

      // Añadir usuario a los participantes
      await pool.execute("INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)", [
        giveawayId,
        interaction.user.id,
      ])

      // Obtener número de participantes
      const [participantsCount] = await pool.execute(
        "SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?",
        [giveawayId],
      )

      // Confirmar participación
      const embed = new EmbedBuilder()
        .setTitle("🎉 Participación Confirmada")
        .setDescription("Has entrado en el sorteo correctamente.")
        .addFields(
          { name: "Premio", value: giveaways[0].prize, inline: true },
          {
            name: "Finaliza",
            value: `<t:${Math.floor(new Date(giveaways[0].end_time).getTime() / 1000)}:R>`,
            inline: true,
          },
          { name: "Participantes", value: participantsCount[0].count.toString(), inline: true },
        )
        .setColor(colors.success)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } catch (error) {
      console.error("Error en interacción de sorteo:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu participación.",
        ephemeral: true,
      })
    }
  },
}
