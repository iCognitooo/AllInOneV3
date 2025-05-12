const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")
const { getGuildSettings } = require("../utils/database")
const { captchas } = require("../buttons/verify-captcha")

module.exports = {
  customId: "verify-captcha-modal",
  async execute(interaction) {
    try {
      const input = interaction.fields.getTextInputValue("captcha-input")

      // Verificar captcha
      const captchaData = captchas.get(interaction.user.id)
      if (!captchaData) {
        return interaction.reply({
          content: "Tu sesión ha expirado. Por favor, inténtalo de nuevo.",
          ephemeral: true,
        })
      }

      // Verificar si el captcha ha expirado
      if (Date.now() > captchaData.expires) {
        captchas.delete(interaction.user.id)
        return interaction.reply({
          content: "El captcha ha expirado. Por favor, inténtalo de nuevo.",
          ephemeral: true,
        })
      }

      // Verificar código
      if (input !== captchaData.code) {
        captchaData.attempts++

        if (captchaData.attempts >= 3) {
          captchas.delete(interaction.user.id)
          return interaction.reply({
            content: "Demasiados intentos fallidos. Por favor, inténtalo de nuevo más tarde.",
            ephemeral: true,
          })
        }

        return interaction.reply({
          content: `Código incorrecto. Te quedan ${3 - captchaData.attempts} intentos.`,
          ephemeral: true,
        })
      }

      // Código correcto, asignar rol
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

      // Limpiar captcha
      captchas.delete(interaction.user.id)

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
        [interaction.user.id, interaction.guild.id, "captcha"],
      )
    } catch (error) {
      console.error("Error al verificar captcha:", error)
      await interaction.reply({
        content: "Hubo un error al verificarte. Por favor, inténtalo de nuevo o contacta a un administrador.",
        ephemeral: true,
      })
    }
  },
}
