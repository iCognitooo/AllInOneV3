// Utilidad para programar tareas periódicas

// Verificar recordatorios pendientes
async function checkReminders(client) {
  try {
    const { pool } = require("./database")
    const now = new Date()

    // Obtener recordatorios que deben ejecutarse
    const [reminders] = await pool.execute("SELECT * FROM reminders WHERE active = 1 AND end_time <= ? LIMIT 10", [
      now.toISOString(),
    ])

    for (const reminder of reminders) {
      try {
        // Obtener canal
        const channel = await client.channels.fetch(reminder.channel_id).catch(() => null)
        if (!channel) continue

        // Crear embed del recordatorio
        const { EmbedBuilder } = require("discord.js")
        const { colors } = require("../config.json")

        const reminderEmbed = new EmbedBuilder()
          .setTitle("⏰ Recordatorio")
          .setDescription(reminder.message)
          .addFields(
            { name: "Establecido", value: `<t:${Math.floor(new Date(reminder.created_at).getTime() / 1000)}:R>` },
            { name: "ID", value: reminder.id },
          )
          .setColor(colors.primary)
          .setFooter({
            text: "Usa /reminder cancel para cancelar recordatorios",
            iconURL: client.user.displayAvatarURL(),
          })
          .setTimestamp()

        // Enviar recordatorio
        if (reminder.is_private) {
          const user = await client.users.fetch(reminder.user_id).catch(() => null)
          if (user) {
            await user
              .send({ content: `<@${reminder.user_id}>, aquí está tu recordatorio:`, embeds: [reminderEmbed] })
              .catch(() => {
                // Si no se puede enviar DM, enviar al canal
                channel.send({ content: `<@${reminder.user_id}>, aquí está tu recordatorio:`, embeds: [reminderEmbed] })
              })
          }
        } else {
          await channel.send({ content: `<@${reminder.user_id}>, aquí está tu recordatorio:`, embeds: [reminderEmbed] })
        }

        // Marcar recordatorio como inactivo
        await pool.execute("UPDATE reminders SET active = 0 WHERE id = ?", [reminder.id])
      } catch (error) {
        console.error(`Error al procesar recordatorio ${reminder.id}:`, error)
      }
    }
  } catch (error) {
    console.error("Error al verificar recordatorios:", error)
  }
}

// Verificar sorteos pendientes
async function checkGiveaways(client) {
  try {
    const { pool } = require("./database")
    const now = new Date()

    // Obtener sorteos que deben finalizar
    const [giveaways] = await pool.execute("SELECT * FROM giveaways WHERE ended = 0 AND end_time <= ? LIMIT 5", [
      now.toISOString(),
    ])

    for (const giveaway of giveaways) {
      try {
        // Obtener participantes
        const [entries] = await pool.execute("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?", [
          giveaway.id,
        ])
        const participants = entries.map((entry) => entry.user_id)

        // Seleccionar ganadores
        const winners = selectWinners(participants, giveaway.winners_count)

        // Obtener canal y mensaje
        const guild = await client.guilds.fetch(giveaway.guild_id).catch(() => null)
        if (!guild) continue

        const channel = await guild.channels.fetch(giveaway.channel_id).catch(() => null)
        if (!channel) continue

        const message = await channel.messages.fetch(giveaway.message_id).catch(() => null)
        if (!message) continue

        // Actualizar embed
        const { EmbedBuilder } = require("discord.js")
        const { colors } = require("../config.json")

        const winnersMentions = winners.length > 0 ? winners.map((id) => `<@${id}>`).join(", ") : "Ninguno"

        const endedEmbed = EmbedBuilder.from(message.embeds[0])
          .setTitle(`🎉 SORTEO FINALIZADO: ${giveaway.prize}`)
          .setDescription(
            `${giveaway.description ? `${giveaway.description}\n\n` : ""}` +
              `**Ganadores:** ${winnersMentions}\n` +
              `**Finalizado:** <t:${Math.floor(Date.now() / 1000)}:f>\n` +
              `**Participantes:** ${participants.length}\n` +
              `**Organizado por:** <@${giveaway.creator_id}>`,
          )
          .setColor(winners.length > 0 ? colors.success : colors.error)

        // Actualizar mensaje
        await message.edit({ embeds: [endedEmbed], components: [] })

        // Anunciar ganadores
        if (winners.length > 0) {
          await channel.send({
            content: `¡Felicidades ${winnersMentions}! Has ganado: **${giveaway.prize}**`,
          })
        } else {
          await channel.send({
            content: `No hubo suficientes participantes para el sorteo: **${giveaway.prize}**`,
          })
        }

        // Marcar sorteo como finalizado
        await pool.execute("UPDATE giveaways SET ended = 1, winners = ? WHERE id = ?", [
          JSON.stringify(winners),
          giveaway.id,
        ])
      } catch (error) {
        console.error(`Error al finalizar sorteo ${giveaway.id}:`, error)
      }
    }
  } catch (error) {
    console.error("Error al verificar sorteos:", error)
  }
}

// Función para seleccionar ganadores aleatorios
function selectWinners(participants, count) {
  if (participants.length === 0) return []
  if (participants.length <= count) return participants

  const winners = []
  const participantsCopy = [...participants]

  for (let i = 0; i < count; i++) {
    if (participantsCopy.length === 0) break
    const randomIndex = Math.floor(Math.random() * participantsCopy.length)
    winners.push(participantsCopy[randomIndex])
    participantsCopy.splice(randomIndex, 1)
  }

  return winners
}

module.exports = {
  checkReminders,
  checkGiveaways,
}
