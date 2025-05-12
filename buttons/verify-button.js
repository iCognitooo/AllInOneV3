const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")
const { getGuildSettings } = require("../utils/database")

module.exports = {
  customId: "verify-button",
  async execute(interaction) {
    try {
      // Obtener configuración del servidor
      const settings = await getGuildSettings(interaction.guild.id)
      if (!settings.verification_role) {
        return interaction.reply({
          content: "El sistema de verificación no está configurado correctamente.",
          ephemeral: true,
        })
      }

      // Verificar si el usuario ya tiene el rol
      const member = await interaction.guild.members.fetch(interaction.user.id)
      if (member.roles.cache.has(settings.verification_role)) {
        return interaction.reply({
          content: "Ya estás verificado.",
          ephemeral: true,
        })
      }

      // Asignar rol
      await member.roles.add(settings.verification_role)

      // Confirmar verificación
      const embed = new EmbedBuilder()
        .setTitle("✅ Verificación Exitosa")
        .setDescription("Has sido verificado correctamente. Ahora tienes acceso al servidor.")
        .setColor(colors.success)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })

      // Registrar verificación
      const { pool } = require("../utils/database")
      await pool.execute(
        "INSERT INTO verifications (user_id, guild_id, verified_at, verification_type) VALUES (?, ?, NOW(), ?)",
        [interaction.user.id, interaction.guild.id, "button"],
      )
    } catch (error) {
      console.error("Error al verificar usuario:", error)
      await interaction.reply({
        content: "Hubo un error al verificarte. Por favor, inténtalo de nuevo o contacta a un administrador.",
        ephemeral: true,
      })
    }
  },
}
