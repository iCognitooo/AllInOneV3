const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Crea una encuesta")
    .addStringOption((option) =>
      option.setName("pregunta").setDescription("La pregunta de la encuesta").setRequired(true),
    )
    .addStringOption((option) => option.setName("opcion1").setDescription("Primera opción").setRequired(true))
    .addStringOption((option) => option.setName("opcion2").setDescription("Segunda opción").setRequired(true))
    .addStringOption((option) => option.setName("opcion3").setDescription("Tercera opción").setRequired(false))
    .addStringOption((option) => option.setName("opcion4").setDescription("Cuarta opción").setRequired(false))
    .addStringOption((option) => option.setName("opcion5").setDescription("Quinta opción").setRequired(false))
    .addBooleanOption((option) =>
      option.setName("anonimo").setDescription("¿Los votos serán anónimos?").setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("duracion")
        .setDescription("Duración de la encuesta en minutos (0 para no tener límite)")
        .setRequired(false),
    )
    .addStringOption((option) => option.setName("color").setDescription("Color del embed (hex)").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 10,
  async execute(interaction) {
    try {
      const question = interaction.options.getString("pregunta")
      const options = []
      for (let i = 1; i <= 5; i++) {
        const option = interaction.options.getString(`opcion${i}`)
        if (option) options.push(option)
      }
      const anonymous = interaction.options.getBoolean("anonimo") ?? true
      const duration = interaction.options.getInteger("duracion") || 0
      const color = interaction.options.getString("color") || colors.primary

      // Crear ID único para la encuesta
      const pollId = Date.now().toString()

      // Crear embed de la encuesta
      const embed = new EmbedBuilder()
        .setTitle(`📊 ${question}`)
        .setDescription("Vota usando los botones de abajo.")
        .setColor(color)
        .setFooter({
          text: `Encuesta creada por ${interaction.user.tag} | ${anonymous ? "Votos anónimos" : "Votos públicos"}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp()

      // Añadir opciones al embed
      for (let i = 0; i < options.length; i++) {
        embed.addFields({ name: `Opción ${i + 1}`, value: `${options[i]}\n**Votos:** 0`, inline: true })
      }

      // Si hay duración, añadir campo de tiempo restante
      if (duration > 0) {
        const endTime = new Date(Date.now() + duration * 60000)
        embed.addFields({
          name: "Tiempo Restante",
          value: `La encuesta termina <t:${Math.floor(endTime.getTime() / 1000)}:R>`,
        })
      }

      // Crear botones para votar
      const rows = []
      let currentRow = new ActionRowBuilder()
      for (let i = 0; i < options.length; i++) {
        if (i > 0 && i % 5 === 0) {
          rows.push(currentRow)
          currentRow = new ActionRowBuilder()
        }
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll:${pollId}:${i}`)
            .setLabel(`Opción ${i + 1}`)
            .setStyle(ButtonStyle.Primary),
        )
      }
      rows.push(currentRow)

      // Enviar encuesta
      const message = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true })

      // Guardar encuesta en la base de datos
      const { pool } = require("../../utils/database")
      await pool.execute(
        "INSERT INTO polls (id, guild_id, channel_id, message_id, creator_id, question, options, anonymous, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          pollId,
          interaction.guild.id,
          interaction.channel.id,
          message.id,
          interaction.user.id,
          question,
          JSON.stringify(options),
          anonymous ? 1 : 0,
          duration > 0 ? new Date(Date.now() + duration * 60000).toISOString() : null,
        ],
      )

      // Si hay duración, programar finalización
      if (duration > 0) {
        setTimeout(async () => {
          try {
            // Obtener resultados finales
            const [pollData] = await pool.execute("SELECT * FROM polls WHERE id = ?", [pollId])
            if (pollData.length === 0) return

            const poll = pollData[0]
            const [voteData] = await pool.execute("SELECT * FROM poll_votes WHERE poll_id = ?", [pollId])

            // Contar votos
            const votes = Array(options.length).fill(0)
            for (const vote of voteData) {
              votes[vote.option_index]++
            }

            // Actualizar embed con resultados finales
            const finalEmbed = EmbedBuilder.from(message.embeds[0])
              .setTitle(`📊 ${question} (Finalizada)`)
              .setDescription("Esta encuesta ha finalizado.")
              .setFields([])

            for (let i = 0; i < options.length; i++) {
              finalEmbed.addFields({
                name: `Opción ${i + 1}`,
                value: `${options[i]}\n**Votos:** ${votes[i]}`,
                inline: true,
              })
            }

            // Determinar ganador
            const maxVotes = Math.max(...votes)
            const winners = votes.map((v, i) => (v === maxVotes ? i : -1)).filter((i) => i !== -1)
            if (winners.length > 0) {
              if (winners.length === 1) {
                finalEmbed.addFields({
                  name: "🏆 Resultado",
                  value: `La opción ganadora es: **${options[winners[0]]}** con ${maxVotes} votos.`,
                })
              } else {
                finalEmbed.addFields({
                  name: "🏆 Resultado",
                  value: `Empate entre: ${winners.map((i) => `**${options[i]}**`).join(", ")} con ${maxVotes} votos cada una.`,
                })
              }
            }

            // Actualizar mensaje
            await message.edit({ embeds: [finalEmbed], components: [] })

            // Marcar encuesta como finalizada
            await pool.execute("UPDATE polls SET active = 0 WHERE id = ?", [pollId])
          } catch (error) {
            console.error("Error al finalizar encuesta:", error)
          }
        }, duration * 60000)
      }
    } catch (error) {
      console.error("Error al crear encuesta:", error)
      await interaction.reply({
        content: "Hubo un error al crear la encuesta.",
        ephemeral: true,
      })
    }
  },
}
