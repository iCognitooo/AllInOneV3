const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")

// Referencia al mapa de tokens (en producción, usar una base de datos)
const loginTokens = new Map()

module.exports = {
  customId: "login-code-modal",
  async execute(interaction) {
    const code = interaction.fields.getTextInputValue("login-code-input")

    // Obtener información de login del usuario
    const loginInfo = loginTokens.get(interaction.user.id)

    if (!loginInfo) {
      return interaction.reply({
        content: "Tu sesión ha expirado. Por favor, inicia el proceso de nuevo con /login.",
        ephemeral: true,
      })
    }

    // Verificar si el token ha expirado
    if (Date.now() > loginInfo.expires) {
      loginTokens.delete(interaction.user.id)
      return interaction.reply({
        content: "Tu código ha expirado. Por favor, inicia el proceso de nuevo con /login.",
        ephemeral: true,
      })
    }

    // Verificar el código
    if (code === loginInfo.token.substring(0, 6)) {
      // Código correcto, iniciar sesión
      const embed = new EmbedBuilder()
        .setTitle("✅ Inicio de Sesión Exitoso")
        .setDescription("Has iniciado sesión correctamente en el sistema de Cognixion Studio.")
        .addFields(
          { name: "Usuario", value: interaction.user.tag, inline: true },
          { name: "ID", value: interaction.user.id, inline: true },
          { name: "Fecha", value: new Date().toLocaleString(), inline: true },
        )
        .setColor(colors.success)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Cognixion Studio", iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp()

      // Limpiar el token
      loginTokens.delete(interaction.user.id)

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else {
      // Código incorrecto
      loginInfo.attempts += 1

      if (loginInfo.attempts >= 3) {
        // Demasiados intentos fallidos
        loginTokens.delete(interaction.user.id)
        return interaction.reply({
          content: "Demasiados intentos fallidos. Por favor, inicia el proceso de nuevo con /login.",
          ephemeral: true,
        })
      }

      await interaction.reply({
        content: `Código incorrecto. Te quedan ${3 - loginInfo.attempts} intentos.`,
        ephemeral: true,
      })
    }
  },
}
