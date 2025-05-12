const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")
const { getUser } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Intenta robar monedas a otro usuario")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuario al que quieres robar").setRequired(true),
    ),
  cooldown: 7200, // 2 horas
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("usuario")

      // No permitir robarse a sí mismo
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          content: "No puedes robarte a ti mismo.",
          ephemeral: true,
        })
      }

      // No permitir robar a bots
      if (targetUser.bot) {
        return interaction.reply({
          content: "No puedes robar a un bot.",
          ephemeral: true,
        })
      }

      // Obtener datos de ambos usuarios
      const user = await getUser(interaction.user.id, interaction.user.tag)
      const target = await getUser(targetUser.id, targetUser.tag)

      // Verificar si el objetivo tiene suficientes monedas
      if (target.coins < 50) {
        return interaction.reply({
          content: `${targetUser.username} no tiene suficientes monedas para robar.`,
          ephemeral: true,
        })
      }

      // Verificar si el usuario tiene suficientes monedas para intentar robar
      if (user.coins < 25) {
        return interaction.reply({
          content: "Necesitas al menos 25 monedas para intentar robar.",
          ephemeral: true,
        })
      }

      // Calcular probabilidad de éxito (40% base, aumenta con nivel)
      const successChance = 0.4 + Math.min(0.3, user.level * 0.01)
      const success = Math.random() < successChance

      const { pool } = require("../../utils/database")

      if (success) {
        // Robo exitoso - robar entre 10% y 20% de las monedas del objetivo
        const stolenAmount = Math.floor(target.coins * (Math.random() * 0.1 + 0.1))
        const cappedAmount = Math.min(stolenAmount, 1000) // Máximo 1000 monedas

        // Actualizar monedas
        await pool.execute("UPDATE users SET coins = coins + ? WHERE id = ?", [cappedAmount, interaction.user.id])
        await pool.execute("UPDATE users SET coins = coins - ? WHERE id = ?", [cappedAmount, targetUser.id])

        // Crear embed
        const embed = new EmbedBuilder()
          .setTitle("🔫 Robo Exitoso")
          .setDescription(`Has robado ${cappedAmount} monedas a ${targetUser.username}!`)
          .setColor(colors.success)
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })

        // Notificar al objetivo
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle("¡Te han robado!")
            .setDescription(`${interaction.user.tag} te ha robado ${cappedAmount} monedas.`)
            .setColor(colors.error)
            .setTimestamp()

          await targetUser.send({ embeds: [dmEmbed] })
        } catch (error) {
          console.log(`No se pudo enviar DM a ${targetUser.tag}`)
        }
      } else {
        // Robo fallido - perder entre 25 y 50 monedas
        const penalty = Math.floor(Math.random() * 26 + 25)

        // Actualizar monedas
        await pool.execute("UPDATE users SET coins = coins - ? WHERE id = ?", [penalty, interaction.user.id])

        // Crear embed
        const embed = new EmbedBuilder()
          .setTitle("❌ Robo Fallido")
          .setDescription(
            `Has sido atrapado intentando robar a ${targetUser.username} y has tenido que pagar una multa de ${penalty} monedas.`,
          )
          .setColor(colors.error)
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })

        // Notificar al objetivo
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle("¡Intento de robo!")
            .setDescription(`${interaction.user.tag} intentó robarte pero falló.`)
            .setColor(colors.warning)
            .setTimestamp()

          await targetUser.send({ embeds: [dmEmbed] })
        } catch (error) {
          console.log(`No se pudo enviar DM a ${targetUser.tag}`)
        }
      }
    } catch (error) {
      console.error("Error en comando rob:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
