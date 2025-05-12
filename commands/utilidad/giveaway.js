const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../../config.json")
const ms = require("ms")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Gestiona sorteos en el servidor")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Inicia un nuevo sorteo")
        .addStringOption((option) => option.setName("premio").setDescription("Premio del sorteo").setRequired(true))
        .addStringOption((option) =>
          option.setName("duracion").setDescription("Duración del sorteo (ej: 1d, 12h, 30m)").setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("ganadores")
            .setDescription("Número de ganadores")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10),
        )
        .addChannelOption((option) =>
          option.setName("canal").setDescription("Canal donde se realizará el sorteo").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("descripcion").setDescription("Descripción adicional del sorteo").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("Finaliza un sorteo antes de tiempo")
        .addStringOption((option) =>
          option.setName("mensaje_id").setDescription("ID del mensaje del sorteo").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reroll")
        .setDescription("Vuelve a elegir ganadores de un sorteo finalizado")
        .addStringOption((option) =>
          option.setName("mensaje_id").setDescription("ID del mensaje del sorteo").setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("ganadores")
            .setDescription("Número de nuevos ganadores")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  cooldown: 10,
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand()

      if (subcommand === "start") {
        const prize = interaction.options.getString("premio")
        const durationStr = interaction.options.getString("duracion")
        const winnersCount = interaction.options.getInteger("ganadores") || 1
        const channel = interaction.options.getChannel("canal") || interaction.channel
        const description = interaction.options.getString("descripcion") || ""

        // Convertir duración a milisegundos
        const duration = ms(durationStr)
        if (!duration || duration < 60000) {
          // Mínimo 1 minuto
          return interaction.reply({
            content: "Duración inválida. Usa un formato como '10m', '1h', '1d'.",
            ephemeral: true,
          })
        }

        // Calcular tiempo de finalización
        const endTime = Date.now() + duration

        // Crear embed del sorteo
        const embed = new EmbedBuilder()
          .setTitle(`🎉 SORTEO: ${prize}`)
          .setDescription(
            `${description ? `${description}\n\n` : ""}Reacciona con 🎉 para participar!\n\n` +
              `**Tiempo Restante:** <t:${Math.floor(endTime / 1000)}:R>\n` +
              `**Finaliza:** <t:${Math.floor(endTime / 1000)}:f>\n` +
              `**Ganadores:** ${winnersCount}\n` +
              `**Organizado por:** ${interaction.user}`,
          )
          .setColor(colors.primary)
          .setFooter({ text: `ID: ${interaction.id}`, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        // Botón para participar
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway:${interaction.id}`)
            .setLabel("Participar")
            .setEmoji("🎉")
            .setStyle(ButtonStyle.Primary),
        )

        // Enviar mensaje del sorteo
        const giveawayMessage = await channel.send({ embeds: [embed], components: [row] })

        // Guardar sorteo en la base de datos
        const { pool } = require("../../utils/database")
        await pool.execute(
          "INSERT INTO giveaways (id, guild_id, channel_id, message_id, prize, description, winners_count, end_time, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            interaction.id,
            interaction.guild.id,
            channel.id,
            giveawayMessage.id,
            prize,
            description,
            winnersCount,
            new Date(endTime).toISOString(),
            interaction.user.id,
          ],
        )

        // Confirmar creación
        await interaction.reply({
          content: `Sorteo creado en ${channel}. Finalizará <t:${Math.floor(endTime / 1000)}:R>.`,
          ephemeral: true,
        })

        // Programar finalización
        setTimeout(async () => {
          try {
            await endGiveaway(interaction.id, interaction.client)
          } catch (error) {
            console.error("Error al finalizar sorteo:", error)
          }
        }, duration)
      } else if (subcommand === "end") {
        const messageId = interaction.options.getString("mensaje_id")

        // Buscar sorteo en la base de datos
        const { pool } = require("../../utils/database")
        const [giveaways] = await pool.execute(
          "SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ? AND ended = 0",
          [messageId, interaction.guild.id],
        )

        if (giveaways.length === 0) {
          return interaction.reply({
            content: "No se encontró ningún sorteo activo con ese ID de mensaje.",
            ephemeral: true,
          })
        }

        // Finalizar sorteo
        await endGiveaway(giveaways[0].id, interaction.client)

        await interaction.reply({
          content: "El sorteo ha sido finalizado manualmente.",
          ephemeral: true,
        })
      } else if (subcommand === "reroll") {
        const messageId = interaction.options.getString("mensaje_id")
        const winnersCount = interaction.options.getInteger("ganadores") || 1

        // Buscar sorteo en la base de datos
        const { pool } = require("../../utils/database")
        const [giveaways] = await pool.execute(
          "SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ? AND ended = 1",
          [messageId, interaction.guild.id],
        )

        if (giveaways.length === 0) {
          return interaction.reply({
            content: "No se encontró ningún sorteo finalizado con ese ID de mensaje.",
            ephemeral: true,
          })
        }

        const giveaway = giveaways[0]

        // Obtener participantes
        const [entries] = await pool.execute("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?", [
          giveaway.id,
        ])

        if (entries.length === 0) {
          return interaction.reply({
            content: "No hubo participantes en ese sorteo.",
            ephemeral: true,
          })
        }

        // Seleccionar nuevos ganadores
        const participants = entries.map((entry) => entry.user_id)
        const winners = selectWinners(participants, winnersCount)

        // Obtener canal y mensaje
        const channel = await interaction.guild.channels.fetch(giveaway.channel_id).catch(() => null)
        if (!channel) {
          return interaction.reply({
            content: "No se pudo encontrar el canal del sorteo.",
            ephemeral: true,
          })
        }

        // Anunciar nuevos ganadores
        const winnersMentions = winners.length > 0 ? winners.map((id) => `<@${id}>`).join(", ") : "Ninguno"

        const rerollEmbed = new EmbedBuilder()
          .setTitle("🎉 Nuevos Ganadores")
          .setDescription(`**Premio:** ${giveaway.prize}\n**Ganadores:** ${winnersMentions}`)
          .setColor(colors.success)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        await channel.send({ embeds: [rerollEmbed] })

        await interaction.reply({
          content: `Se han seleccionado nuevos ganadores para el sorteo "${giveaway.prize}".`,
          ephemeral: true,
        })
      }
    } catch (error) {
      console.error("Error en comando giveaway:", error)
      await interaction.reply({
        content: "Hubo un error al procesar el sorteo.",
        ephemeral: true,
      })
    }
  },
}

// Función para finalizar un sorteo
async function endGiveaway(giveawayId, client) {
  try {
    // Obtener datos del sorteo
    const { pool } = require("../../utils/database")
    const [giveaways] = await pool.execute("SELECT * FROM giveaways WHERE id = ?", [giveawayId])

    if (giveaways.length === 0 || giveaways[0].ended) {
      return
    }

    const giveaway = giveaways[0]

    // Obtener participantes
    const [entries] = await pool.execute("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?", [giveawayId])
    const participants = entries.map((entry) => entry.user_id)

    // Seleccionar ganadores
    const winners = selectWinners(participants, giveaway.winners_count)

    // Obtener canal y mensaje
    const guild = await client.guilds.fetch(giveaway.guild_id).catch(() => null)
    if (!guild) return

    const channel = await guild.channels.fetch(giveaway.channel_id).catch(() => null)
    if (!channel) return

    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null)
    if (!message) return

    // Actualizar embed
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
      giveawayId,
    ])
  } catch (error) {
    console.error("Error al finalizar sorteo:", error)
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
