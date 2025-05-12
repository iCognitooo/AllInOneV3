const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js")
const { createCanvas, loadImage } = require("canvas")
const { getData } = require("../../utils/data-manager")
const logger = require("../../utils/logger")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Muestra tu tarjeta de nivel o la de otro usuario")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuario del que quieres ver el nivel").setRequired(false),
    ),
  cooldown: 5,
  async execute(interaction) {
    try {
      await interaction.deferReply()

      const targetUser = interaction.options.getUser("usuario") || interaction.user
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.editReply("No se pudo encontrar a ese usuario en el servidor.")
      }

      // Obtener datos del usuario
      const userData = await getData(
        "levels",
        { userId: targetUser.id, guildId: interaction.guild.id },
        `SELECT * FROM users WHERE id = ?`,
        [targetUser.id],
      )

      // Si no hay datos, usar valores predeterminados
      const userLevel =
        userData && userData.length > 0
          ? userData[0]
          : {
              xp: 0,
              level: 1,
              userId: targetUser.id,
              guildId: interaction.guild.id,
            }

      // Calcular XP necesario para el siguiente nivel
      const currentXP = userLevel.xp || 0
      const currentLevel = userLevel.level || 1
      const xpNeeded = 5 * currentLevel ** 2 + 50 * currentLevel + 100
      const xpProgress = (currentXP / xpNeeded) * 100

      // Crear canvas
      const canvas = createCanvas(800, 250)
      const ctx = canvas.getContext("2d")

      // Fondo
      ctx.fillStyle = "#23272A"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Borde
      ctx.strokeStyle = "#5865F2"
      ctx.lineWidth = 8
      ctx.strokeRect(0, 0, canvas.width, canvas.height)

      // Avatar
      const avatar = await loadImage(targetUser.displayAvatarURL({ extension: "png", size: 256 }))
      ctx.save()
      ctx.beginPath()
      ctx.arc(125, 125, 80, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(avatar, 45, 45, 160, 160)
      ctx.restore()

      // Nombre de usuario - Usar fuente del sistema
      ctx.font = "bold 35px Arial"
      ctx.fillStyle = "#FFFFFF"
      ctx.fillText(targetUser.username, 240, 85)

      // Nivel y XP - Usar fuente del sistema
      ctx.font = "30px Arial"
      ctx.fillStyle = "#5865F2"
      ctx.fillText(`Nivel: ${currentLevel}`, 240, 130)
      ctx.fillText(`XP: ${currentXP} / ${xpNeeded}`, 240, 170)

      // Barra de progreso (fondo)
      ctx.fillStyle = "#484B51"
      ctx.fillRect(240, 180, 500, 30)

      // Barra de progreso (relleno)
      ctx.fillStyle = "#5865F2"
      ctx.fillRect(240, 180, (500 * xpProgress) / 100, 30)

      // Porcentaje - Usar fuente del sistema
      ctx.font = "bold 20px Arial"
      ctx.fillStyle = "#FFFFFF"
      ctx.fillText(`${Math.round(xpProgress)}%`, 470, 202)

      // Convertir canvas a imagen
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "rank.png" })

      // Enviar imagen
      await interaction.editReply({ files: [attachment] })
    } catch (error) {
      logger.error("Error al crear tarjeta de nivel:", error)
      await interaction.editReply("Hubo un error al generar la tarjeta de nivel.")
    }
  },
}
