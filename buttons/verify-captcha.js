const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js")
const crypto = require("crypto")

// Almacenamiento temporal de captchas (en producción, usar una base de datos)
const captchas = new Map()

module.exports = {
  customId: "verify-captcha",
  async execute(interaction) {
    try {
      // Generar captcha
      const captcha = generateCaptcha()

      // Guardar captcha para este usuario
      captchas.set(interaction.user.id, {
        code: captcha,
        expires: Date.now() + 300000, // 5 minutos
        attempts: 0,
      })

      // Crear modal para introducir captcha
      const modal = new ModalBuilder().setCustomId("verify-captcha-modal").setTitle("Verificación de Captcha")

      const captchaInput = new TextInputBuilder()
        .setCustomId("captcha-input")
        .setLabel(`Introduce el código: ${captcha}`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Escribe el código exactamente como aparece")
        .setRequired(true)
        .setMinLength(6)
        .setMaxLength(6)

      const firstRow = new ActionRowBuilder().addComponents(captchaInput)

      modal.addComponents(firstRow)

      await interaction.showModal(modal)
    } catch (error) {
      console.error("Error al mostrar captcha:", error)
      await interaction.reply({
        content: "Hubo un error al generar el captcha. Por favor, inténtalo de nuevo.",
        ephemeral: true,
      })
    }
  },
}

// Función para generar captcha
function generateCaptcha() {
  // Generar código alfanumérico de 6 caracteres
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, chars.length)
    code += chars.charAt(randomIndex)
  }
  return code
}

// Exportar mapa de captchas para acceder desde el modal
module.exports.captchas = captchas
