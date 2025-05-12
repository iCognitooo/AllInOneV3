const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../config.json")
const { getGuildSettings } = require("./database")
const fs = require("fs").promises
const path = require("path")

// Crear un nuevo ticket
async function createTicket(interaction, type, reason) {
  try {
    const { user, guild } = interaction

    // Obtener configuración del servidor
    const settings = await getGuildSettings(guild.id)
    if (!settings.ticket_category || !settings.ticket_log_channel || !settings.ticket_staff_role) {
      return interaction.reply({
        content: "El sistema de tickets no está configurado correctamente.",
        ephemeral: true,
      })
    }

    // Verificar si el usuario ya tiene un ticket abierto
    const { pool } = require("./database")
    const [existingTickets] = await pool.execute(
      "SELECT * FROM tickets WHERE creator = ? AND guild_id = ? AND status = 'open'",
      [user.id, guild.id],
    )

    if (existingTickets.length > 0) {
      return interaction.reply({
        content: `Ya tienes un ticket abierto: <#${existingTickets[0].channel_id}>`,
        ephemeral: true,
      })
    }

    // Generar número de ticket
    const [ticketCount] = await pool.execute("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?", [guild.id])
    const ticketNumber = ticketCount[0].count + 1

    // Crear canal de ticket
    const ticketChannel = await guild.channels.create({
      name: `ticket-${ticketNumber}-${user.username}`,
      type: ChannelType.GuildText,
      parent: settings.ticket_category,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: settings.ticket_staff_role,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ],
    })

    // Guardar ticket en la base de datos
    await pool.execute(
      "INSERT INTO tickets (channel_id, guild_id, creator, type, reason, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', NOW())",
      [ticketChannel.id, guild.id, user.id, type, reason],
    )

    // Crear mensaje de bienvenida
    const embed = new EmbedBuilder()
      .setTitle(`Ticket #${ticketNumber}`)
      .setDescription(
        `Bienvenido ${user} a tu ticket.\nUn miembro del staff te atenderá lo antes posible.\n\n**Tipo:** ${
          typeNames[type] || "General"
        }\n**Razón:** ${reason}`,
      )
      .setColor(getColorForType(type))
      .setFooter({ text: `ID: ${ticketChannel.id}`, iconURL: guild.iconURL() })
      .setTimestamp()

    // Botones de acción
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close-ticket").setLabel("Cerrar").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
      new ButtonBuilder().setCustomId("claim-ticket").setLabel("Reclamar").setStyle(ButtonStyle.Primary).setEmoji("✋"),
    )

    await ticketChannel.send({ embeds: [embed], components: [row] })
    await ticketChannel.send({ content: `<@${user.id}> <@&${settings.ticket_staff_role}>` }).then((msg) => {
      msg.delete().catch(console.error) // Eliminar ping después de enviarlo
    })

    // Notificar al usuario
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await interaction.reply({
        content: `Tu ticket ha sido creado: ${ticketChannel}`,
        ephemeral: true,
      })
    } else {
      await interaction.reply({
        content: `Tu ticket ha sido creado: ${ticketChannel}`,
        ephemeral: true,
      })
    }

    // Registrar en logs
    logTicketAction(guild, {
      action: "create",
      ticketId: ticketNumber,
      channelId: ticketChannel.id,
      userId: user.id,
      type,
      reason,
    })

    return ticketChannel
  } catch (error) {
    console.error("Error al crear ticket:", error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "Hubo un error al crear el ticket.",
        ephemeral: true,
      })
    } else {
      await interaction.reply({
        content: "Hubo un error al crear el ticket.",
        ephemeral: true,
      })
    }
    return null
  }
}

// Cerrar un ticket
async function closeTicket(interaction, reason) {
  try {
    const { channel, user, guild } = interaction

    // Verificar si es un canal de ticket
    const { pool } = require("./database")
    const [ticketData] = await pool.execute("SELECT * FROM tickets WHERE channel_id = ?", [channel.id])

    if (ticketData.length === 0) {
      return interaction.reply({
        content: "Este canal no es un ticket.",
        ephemeral: true,
      })
    }

    const ticket = ticketData[0]
    if (ticket.status !== "open") {
      return interaction.reply({
        content: "Este ticket ya está cerrado.",
        ephemeral: true,
      })
    }

    // Generar transcripción
    const transcript = await generateTranscript(channel)
    const transcriptPath = path.join(__dirname, "..", "transcripts", `ticket-${ticket.id}.html`)
    await fs.mkdir(path.join(__dirname, "..", "transcripts"), { recursive: true })
    await fs.writeFile(transcriptPath, transcript)

    // Actualizar estado del ticket en la base de datos
    await pool.execute(
      "UPDATE tickets SET status = 'closed', closed_by = ?, closed_at = NOW(), close_reason = ? WHERE channel_id = ?",
      [user.id, reason || "No se proporcionó una razón", channel.id],
    )

    // Mensaje de cierre
    const embed = new EmbedBuilder()
      .setTitle("Ticket Cerrado")
      .setDescription(`Este ticket ha sido cerrado por ${user}.\n**Razón:** ${reason || "No se proporcionó una razón"}`)
      .setColor(colors.error)
      .setFooter({ text: "El canal se eliminará en 10 segundos" })
      .setTimestamp()

    await channel.send({ embeds: [embed] })

    // Enviar transcripción al canal de logs
    const settings = await getGuildSettings(guild.id)
    if (settings.ticket_log_channel) {
      const logChannel = await guild.channels.fetch(settings.ticket_log_channel).catch(() => null)
      if (logChannel) {
        const creator = await guild.members.fetch(ticket.creator).catch(() => null)
        const creatorName = creator ? creator.user.tag : "Usuario desconocido"

        const logEmbed = new EmbedBuilder()
          .setTitle(`Ticket #${ticket.id} Cerrado`)
          .setDescription("Un ticket ha sido cerrado.")
          .addFields(
            { name: "Ticket", value: `#${ticket.id}`, inline: true },
            { name: "Creador", value: creatorName, inline: true },
            { name: "Cerrado por", value: user.tag, inline: true },
            { name: "Tipo", value: typeNames[ticket.type] || "General", inline: true },
            { name: "Razón de cierre", value: reason || "No se proporcionó una razón" },
          )
          .setColor(colors.error)
          .setTimestamp()

        // Adjuntar transcripción como archivo
        await logChannel.send({
          embeds: [logEmbed],
          files: [
            {
              attachment: transcriptPath,
              name: `ticket-${ticket.id}.html`,
            },
          ],
        })
      }
    }

    // Eliminar canal después de 10 segundos
    setTimeout(() => {
      channel.delete().catch(console.error)
    }, 10000)

    return true
  } catch (error) {
    console.error("Error al cerrar ticket:", error)
    await interaction.reply({
      content: "Hubo un error al cerrar el ticket.",
      ephemeral: true,
    })
    return false
  }
}

// Reclamar un ticket
async function claimTicket(interaction) {
  try {
    const { channel, user, guild } = interaction

    // Verificar si es un canal de ticket
    const { pool } = require("./database")
    const [ticketData] = await pool.execute("SELECT * FROM tickets WHERE channel_id = ?", [channel.id])

    if (ticketData.length === 0) {
      return interaction.reply({
        content: "Este canal no es un ticket.",
        ephemeral: true,
      })
    }

    const ticket = ticketData[0]
    if (ticket.claimed_by) {
      const claimedBy = await guild.members.fetch(ticket.claimed_by).catch(() => null)
      return interaction.reply({
        content: `Este ticket ya ha sido reclamado por ${claimedBy ? claimedBy.user.tag : "un miembro del staff"}.`,
        ephemeral: true,
      })
    }

    // Actualizar ticket en la base de datos
    await pool.execute("UPDATE tickets SET claimed_by = ? WHERE channel_id = ?", [user.id, channel.id])

    // Mensaje de reclamación
    const embed = new EmbedBuilder()
      .setTitle("Ticket Reclamado")
      .setDescription(`Este ticket ha sido reclamado por ${user}.\nEllos te ayudarán con tu consulta.`)
      .setColor(colors.primary)
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })

    // Actualizar nombre del canal
    await channel.setName(`claimed-${channel.name.split("-").slice(1).join("-")}`)

    return true
  } catch (error) {
    console.error("Error al reclamar ticket:", error)
    await interaction.reply({
      content: "Hubo un error al reclamar el ticket.",
      ephemeral: true,
    })
    return false
  }
}

// Generar transcripción de un canal
async function generateTranscript(channel) {
  try {
    let html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transcripción de Ticket</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .message { margin-bottom: 15px; padding: 10px; border-radius: 5px; background-color: #f5f5f5; }
            .author { font-weight: bold; color: #333; }
            .timestamp { font-size: 0.8em; color: #666; }
            .content { margin-top: 5px; }
            .header { text-align: center; margin-bottom: 30px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Transcripción de Ticket</h1>
            <p>Canal: ${channel.name} (${channel.id})</p>
            <p>Servidor: ${channel.guild.name}</p>
            <p>Fecha: ${new Date().toLocaleString()}</p>
        </div>
        <div class="messages">`

    // Obtener mensajes del canal (hasta 500)
    const messages = await channel.messages.fetch({ limit: 100 })
    const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp)

    // Procesar cada mensaje
    for (const message of sortedMessages) {
      const author = message.author.tag
      const timestamp = message.createdAt.toLocaleString()
      const content = message.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")

      html += `
            <div class="message">
                <div class="author">${author}</div>
                <div class="timestamp">${timestamp}</div>
                <div class="content">${content || "[Sin contenido de texto]"}</div>
            </div>`
    }

    html += `
        </div>
    </body>
    </html>`

    return html
  } catch (error) {
    console.error("Error al generar transcripción:", error)
    return `<html><body><h1>Error al generar transcripción</h1><p>${error.message}</p></body></html>`
  }
}

// Registrar acción de ticket en logs
async function logTicketAction(guild, data) {
  try {
    const settings = await getGuildSettings(guild.id)
    if (!settings.ticket_log_channel) return

    const logChannel = await guild.channels.fetch(settings.ticket_log_channel).catch(() => null)
    if (!logChannel) return

    const { action, ticketId, channelId, userId, type, reason } = data
    const user = await guild.members.fetch(userId).catch(() => null)
    const username = user ? user.user.tag : "Usuario desconocido"

    let embed
    if (action === "create") {
      embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticketId} Creado`)
        .setDescription("Un nuevo ticket ha sido creado.")
        .addFields(
          { name: "Ticket", value: `#${ticketId}`, inline: true },
          { name: "Canal", value: `<#${channelId}>`, inline: true },
          { name: "Creador", value: username, inline: true },
          { name: "Tipo", value: typeNames[type] || "General", inline: true },
          { name: "Razón", value: reason || "No se proporcionó una razón" },
        )
        .setColor(getColorForType(type))
        .setTimestamp()
    }

    if (embed) {
      await logChannel.send({ embeds: [embed] })
    }
  } catch (error) {
    console.error("Error al registrar acción de ticket:", error)
  }
}

// Nombres de tipos de tickets
const typeNames = {
  general: "General",
  soporte: "Soporte Técnico",
  consulta: "Consulta General",
  bug: "Reporte de Bug",
  usuario: "Reporte de Usuario",
  sugerencia: "Sugerencia",
  feedback: "Feedback",
  personalizado: "Personalizado",
}

// Obtener color según tipo de ticket
function getColorForType(type) {
  const typeColors = {
    general: colors.primary,
    soporte: colors.primary,
    consulta: colors.info,
    bug: colors.error,
    usuario: colors.warning,
    sugerencia: colors.success,
    feedback: colors.primary,
    personalizado: colors.primary,
  }

  return typeColors[type] || colors.primary
}

module.exports = {
  createTicket,
  closeTicket,
  claimTicket,
  generateTranscript,
  logTicketAction,
}
