const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")
const ms = require("ms")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Gestiona recordatorios")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Establece un nuevo recordatorio")
        .addStringOption((option) =>
          option.setName("tiempo").setDescription("Tiempo hasta el recordatorio (ej: 1h, 30m, 1d)").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("mensaje").setDescription("Mensaje del recordatorio").setRequired(true),
        )
        .addBooleanOption((option) =>
          option.setName("privado").setDescription("¿El recordatorio debe ser privado?").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("Lista tus recordatorios activos"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cancel")
        .setDescription("Cancela un recordatorio")
        .addStringOption((option) =>
          option.setName("id").setDescription("ID del recordatorio a cancelar").setRequired(true),
        ),
    ),
  cooldown: 5,
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand()

      if (subcommand === "set") {
        const timeString = interaction.options.getString("tiempo")
        const message = interaction.options.getString("mensaje")
        const isPrivate = interaction.options.getBoolean("privado") ?? false

        // Convertir tiempo a milisegundos
        const time = ms(timeString)
        if (!time || time < 60000 || time > 2592000000) {
          // Entre 1 minuto y 30 días
          return interaction.reply({
            content: "Tiempo inválido. Usa un formato como '10m', '1h', '1d'. El tiempo máximo es de 30 días.",
            ephemeral: true,
          })
        }

        // Calcular tiempo de finalización
        const endTime = new Date(Date.now() + time)

        // Generar ID único
        const reminderId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)

        // Guardar recordatorio en la base de datos
        const { pool } = require("../../utils/database")
        await pool.execute(
          "INSERT INTO reminders (id, user_id, guild_id, channel_id, message, end_time, is_private) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            reminderId,
            interaction.user.id,
            interaction.guild.id,
            interaction.channel.id,
            message,
            endTime.toISOString(),
            isPrivate ? 1 : 0,
          ],
        )

        // Confirmar creación
        const embed = new EmbedBuilder()
          .setTitle("⏰ Recordatorio Establecido")
          .setDescription(`Te recordaré: "${message}"`)
          .addFields(
            { name: "Tiempo", value: timeString, inline: true },
            { name: "Fecha", value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: true },
            { name: "ID", value: reminderId, inline: true },
          )
          .setColor(colors.primary)
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp()

        await interaction.reply({ embeds: [embed], ephemeral: isPrivate })

        // Programar recordatorio
        setTimeout(async () => {
          try {
            // Verificar si el recordatorio sigue activo
            const [reminders] = await pool.execute("SELECT * FROM reminders WHERE id = ? AND active = 1", [reminderId])
            if (reminders.length === 0) return

            const reminder = reminders[0]

            // Obtener canal
            const channel = await interaction.client.channels.fetch(reminder.channel_id).catch(() => null)
            if (!channel) return

            // Crear embed del recordatorio
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
                iconURL: interaction.client.user.displayAvatarURL(),
              })
              .setTimestamp()

            // Enviar recordatorio
            if (reminder.is_private) {
              const user = await interaction.client.users.fetch(reminder.user_id).catch(() => null)
              if (user) {
                await user
                  .send({ content: `<@${reminder.user_id}>, aquí está tu recordatorio:`, embeds: [reminderEmbed] })
                  .catch(() => {
                    // Si no se puede enviar DM, enviar al canal
                    channel.send({
                      content: `<@${reminder.user_id}>, aquí está tu recordatorio:`,
                      embeds: [reminderEmbed],
                    })
                  })
              }
            } else {
              await channel.send({
                content: `<@${reminder.user_id}>, aquí está tu recordatorio:`,
                embeds: [reminderEmbed],
              })
            }

            // Marcar recordatorio como inactivo
            await pool.execute("UPDATE reminders SET active = 0 WHERE id = ?", [reminderId])
          } catch (error) {
            console.error("Error al enviar recordatorio:", error)
          }
        }, time)
      } else if (subcommand === "list") {
        // Obtener recordatorios activos del usuario
        const { pool } = require("../../utils/database")
        const [reminders] = await pool.execute(
          "SELECT * FROM reminders WHERE user_id = ? AND active = 1 ORDER BY end_time ASC",
          [interaction.user.id],
        )

        if (reminders.length === 0) {
          return interaction.reply({
            content: "No tienes recordatorios activos.",
            ephemeral: true,
          })
        }

        // Crear embed
        const embed = new EmbedBuilder()
          .setTitle("📋 Tus Recordatorios")
          .setDescription(`Tienes ${reminders.length} recordatorio(s) activo(s).`)
          .setColor(colors.primary)
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp()

        // Añadir recordatorios al embed
        for (const reminder of reminders) {
          const endTime = new Date(reminder.end_time)
          embed.addFields({
            name: `ID: ${reminder.id}`,
            value: `**Mensaje:** ${reminder.message}\n**Vence:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n**Privado:** ${
              reminder.is_private ? "Sí" : "No"
            }`,
          })
        }

        await interaction.reply({ embeds: [embed], ephemeral: true })
      } else if (subcommand === "cancel") {
        const reminderId = interaction.options.getString("id")

        // Verificar si el recordatorio existe y pertenece al usuario
        const { pool } = require("../../utils/database")
        const [reminders] = await pool.execute("SELECT * FROM reminders WHERE id = ? AND user_id = ? AND active = 1", [
          reminderId,
          interaction.user.id,
        ])

        if (reminders.length === 0) {
          return interaction.reply({
            content: "No se encontró ningún recordatorio activo con ese ID o no te pertenece.",
            ephemeral: true,
          })
        }

        // Cancelar recordatorio
        await pool.execute("UPDATE reminders SET active = 0 WHERE id = ?", [reminderId])

        await interaction.reply({
          content: `El recordatorio con ID ${reminderId} ha sido cancelado.`,
          ephemeral: true,
        })
      }
    } catch (error) {
      console.error("Error en comando reminder:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
