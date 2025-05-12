const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { getData, saveData, updateData } = require("../../utils/data-manager")
const logger = require("../../utils/logger")

module.exports = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Reclama tu recompensa diaria"),

  async execute(interaction) {
    try {
      await interaction.deferReply()

      // Consulta SQL para obtener los datos económicos del usuario
      const sqlQuery = `
        SELECT * FROM economy 
        WHERE user_id = ? AND guild_id = ?
      `

      // Obtener datos económicos del usuario
      const economyData = await getData(
        "economy",
        { userId: interaction.user.id, guildId: interaction.guild.id },
        sqlQuery,
        [interaction.user.id, interaction.guild.id],
      )

      // Si no hay datos económicos, crear un registro predeterminado
      let userEconomy
      if (!economyData || economyData.length === 0) {
        userEconomy = {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          balance: 0,
          bank: 0,
          lastDaily: null,
          lastWork: null,
          inventory: [],
        }
      } else {
        userEconomy = economyData[0]
      }

      // Verificar si el usuario ya reclamó su recompensa diaria
      const now = new Date()
      const lastDaily = userEconomy.lastDaily ? new Date(userEconomy.lastDaily) : null

      // Si el usuario ya reclamó su recompensa diaria y no han pasado 24 horas
      if (lastDaily && now - lastDaily < 24 * 60 * 60 * 1000) {
        const timeLeft = 24 * 60 * 60 * 1000 - (now - lastDaily)
        const hours = Math.floor(timeLeft / (60 * 60 * 1000))
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))

        const embed = new EmbedBuilder()
          .setTitle("❌ Recompensa diaria ya reclamada")
          .setDescription(
            `Ya has reclamado tu recompensa diaria. Podrás reclamarla nuevamente en **${hours} horas y ${minutes} minutos**.`,
          )
          .setColor("#FF0000")
          .setFooter({ text: `Solicitado por ${interaction.user.username}` })
          .setTimestamp()

        return await interaction.editReply({ embeds: [embed] })
      }

      // Calcular la cantidad de monedas a dar (entre 100 y 500)
      const amount = Math.floor(Math.random() * 401) + 100

      // Calcular racha de días
      let streak = userEconomy.streak || 0
      let streakBonus = 0

      if (lastDaily) {
        // Si la última recompensa fue ayer (menos de 48 horas pero más de 24 horas atrás)
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)

        if (lastDaily.toDateString() === yesterday.toDateString()) {
          streak++
          streakBonus = Math.floor(streak * 10) // 10 monedas por día de racha
        } else {
          streak = 1 // Reiniciar racha
        }
      } else {
        streak = 1 // Primera vez
      }

      // Actualizar balance y última recompensa diaria
      const totalAmount = amount + streakBonus
      const newBalance = (userEconomy.balance || 0) + totalAmount

      // Actualizar datos en la base de datos
      if (userEconomy.id) {
        // Si el usuario ya existe en la base de datos, actualizar
        await updateData(
          "economy",
          userEconomy.id,
          {
            balance: newBalance,
            lastDaily: now.toISOString(),
            streak: streak,
          },
          `UPDATE economy SET balance = ?, last_daily = ?, streak = ? WHERE id = ?`,
          [newBalance, now.toISOString(), streak, userEconomy.id],
        )
      } else {
        // Si el usuario no existe en la base de datos, insertar
        await saveData(
          "economy",
          {
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            balance: newBalance,
            bank: 0,
            lastDaily: now.toISOString(),
            lastWork: null,
            streak: streak,
            inventory: [],
          },
          `INSERT INTO economy (user_id, guild_id, balance, bank, last_daily, streak) VALUES (?, ?, ?, ?, ?, ?)`,
          [interaction.user.id, interaction.guild.id, newBalance, 0, now.toISOString(), streak],
        )
      }

      // Crear un embed con la información de la recompensa
      const embed = new EmbedBuilder()
        .setTitle("💰 Recompensa Diaria Reclamada")
        .setDescription(`Has reclamado tu recompensa diaria y has recibido **${amount} monedas**!`)
        .setColor("#00FF00")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "💵 Monedas recibidas", value: `${amount}`, inline: true },
          { name: "🔥 Racha actual", value: `${streak} día(s)`, inline: true },
          { name: "⭐ Bonus por racha", value: `${streakBonus}`, inline: true },
          { name: "💰 Total recibido", value: `${totalAmount}`, inline: true },
          { name: "🏦 Nuevo balance", value: `${newBalance}`, inline: true },
        )
        .setFooter({ text: `Vuelve mañana para mantener tu racha!` })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      logger.error(`Error en el comando daily: ${error.message}`)

      // Si ya se ha diferido la respuesta, editar la respuesta
      if (interaction.deferred) {
        await interaction
          .editReply({
            content: "Ha ocurrido un error al reclamar tu recompensa diaria. Por favor, inténtalo de nuevo más tarde.",
          })
          .catch(console.error)
      } else {
        // Si no se ha diferido, responder normalmente
        await interaction
          .reply({
            content: "Ha ocurrido un error al reclamar tu recompensa diaria. Por favor, inténtalo de nuevo más tarde.",
            ephemeral: true,
          })
          .catch(console.error)
      }
    }
  },
}
