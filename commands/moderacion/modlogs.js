const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("Sistema de registros de moderación")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ver")
        .setDescription("Ver registros de moderación de un usuario")
        .addUserOption((option) =>
          option.setName("usuario").setDescription("Usuario del que quieres ver los registros").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("añadir")
        .setDescription("Añadir un registro de moderación")
        .addUserOption((option) =>
          option.setName("usuario").setDescription("Usuario al que añadir el registro").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("tipo")
            .setDescription("Tipo de acción")
            .setRequired(true)
            .addChoices(
              { name: "Advertencia", value: "warn" },
              { name: "Expulsión", value: "kick" },
              { name: "Baneo Temporal", value: "tempban" },
              { name: "Baneo", value: "ban" },
              { name: "Silencio", value: "mute" },
              { name: "Nota", value: "note" },
            ),
        )
        .addStringOption((option) => option.setName("razón").setDescription("Razón de la acción").setRequired(true))
        .addStringOption((option) =>
          option
            .setName("duración")
            .setDescription("Duración de la sanción (para bans temporales y silencio)")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("eliminar")
        .setDescription("Eliminar un registro de moderación")
        .addStringOption((option) =>
          option.setName("id").setDescription("ID del registro a eliminar").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("configurar")
        .setDescription("Configurar el canal de logs de moderación")
        .addChannelOption((option) =>
          option.setName("canal").setDescription("Canal donde se enviarán los logs").setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Simulamos una base de datos en memoria para este ejemplo
    if (!interaction.client.modlogs) {
      interaction.client.modlogs = new Map()
    }

    if (!interaction.client.modlogsConfig) {
      interaction.client.modlogsConfig = new Map()
    }

    if (subcommand === "ver") {
      await handleViewLogs(interaction)
    } else if (subcommand === "añadir") {
      await handleAddLog(interaction)
    } else if (subcommand === "eliminar") {
      await handleDeleteLog(interaction)
    } else if (subcommand === "configurar") {
      await handleConfigureLogs(interaction)
    }
  },
}

async function handleViewLogs(interaction) {
  const targetUser = interaction.options.getUser("usuario")
  const guildId = interaction.guild.id
  const userId = targetUser.id

  // Obtener logs del usuario
  const userLogs = getUserLogs(interaction.client, guildId, userId)

  if (userLogs.length === 0) {
    return interaction.reply({
      content: `No hay registros de moderación para ${targetUser.tag}.`,
      ephemeral: true,
    })
  }

  // Crear embed con los logs
  const embed = new EmbedBuilder()
    .setTitle(`Registros de Moderación - ${targetUser.tag}`)
    .setDescription(`Historial de acciones de moderación para ${targetUser}.`)
    .setColor(colors.primary)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `ID: ${targetUser.id}`, iconURL: interaction.guild.iconURL() })
    .setTimestamp()

  // Añadir los logs al embed (máximo 25 campos)
  const displayLogs = userLogs.slice(0, 25)

  for (const log of displayLogs) {
    const actionEmoji = getActionEmoji(log.type)
    const actionName = getActionName(log.type)
    const timestamp = `<t:${Math.floor(log.timestamp / 1000)}:R>`

    let value = `**Moderador:** ${log.moderatorTag}\n**Razón:** ${log.reason}`
    if (log.duration) {
      value += `\n**Duración:** ${log.duration}`
    }
    value += `\n**Fecha:** ${timestamp}`

    embed.addFields({
      name: `${actionEmoji} ${actionName} (ID: ${log.id})`,
      value: value,
    })
  }

  if (userLogs.length > 25) {
    embed.addFields({
      name: "Más registros",
      value: `Se encontraron ${userLogs.length - 25} registros adicionales que no se muestran.`,
    })
  }

  await interaction.reply({ embeds: [embed], ephemeral: true })
}

async function handleAddLog(interaction) {
  const targetUser = interaction.options.getUser("usuario")
  const type = interaction.options.getString("tipo")
  const reason = interaction.options.getString("razón")
  const duration = interaction.options.getString("duración")

  const guildId = interaction.guild.id
  const userId = targetUser.id

  // Generar ID único para el log
  const logId = generateLogId()

  // Crear registro
  const log = {
    id: logId,
    userId: userId,
    userTag: targetUser.tag,
    guildId: guildId,
    moderatorId: interaction.user.id,
    moderatorTag: interaction.user.tag,
    type: type,
    reason: reason,
    duration: duration,
    timestamp: Date.now(),
  }

  // Guardar log
  saveLog(interaction.client, log)

  // Crear embed de confirmación
  const actionEmoji = getActionEmoji(type)
  const actionName = getActionName(type)

  const embed = new EmbedBuilder()
    .setTitle(`${actionEmoji} Registro de Moderación Añadido`)
    .setDescription(`Se ha añadido un registro de tipo **${actionName}** para ${targetUser}.`)
    .addFields(
      { name: "Usuario", value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: "Moderador", value: interaction.user.tag, inline: true },
      { name: "Tipo", value: actionName, inline: true },
      { name: "Razón", value: reason },
    )
    .setColor(getActionColor(type))
    .setFooter({ text: `ID: ${logId}`, iconURL: interaction.guild.iconURL() })
    .setTimestamp()

  if (duration) {
    embed.addFields({ name: "Duración", value: duration, inline: true })
  }

  await interaction.reply({ embeds: [embed] })

  // Enviar log al canal configurado
  const logChannelId = getLogChannel(interaction.client, guildId)
  if (logChannelId) {
    const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null)
    if (logChannel) {
      await logChannel.send({ embeds: [embed] }).catch(console.error)
    }
  }
}

async function handleDeleteLog(interaction) {
  const logId = interaction.options.getString("id")
  const guildId = interaction.guild.id

  // Buscar y eliminar el log
  const deleted = deleteLog(interaction.client, guildId, logId)

  if (!deleted) {
    return interaction.reply({
      content: `No se encontró ningún registro con ID \`${logId}\`.`,
      ephemeral: true,
    })
  }

  // Confirmar eliminación
  const embed = new EmbedBuilder()
    .setTitle("✅ Registro Eliminado")
    .setDescription(`Se ha eliminado el registro de moderación con ID \`${logId}\`.`)
    .setColor(colors.success)
    .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp()

  await interaction.reply({ embeds: [embed], ephemeral: true })
}

async function handleConfigureLogs(interaction) {
  const channel = interaction.options.getChannel("canal")
  const guildId = interaction.guild.id

  // Guardar configuración
  setLogChannel(interaction.client, guildId, channel.id)

  // Confirmar configuración
  const embed = new EmbedBuilder()
    .setTitle("✅ Canal de Logs Configurado")
    .setDescription(`Los registros de moderación se enviarán a ${channel}.`)
    .setColor(colors.success)
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

// Funciones auxiliares
function getUserLogs(client, guildId, userId) {
  const allLogs = client.modlogs.get(guildId) || []
  return allLogs.filter((log) => log.userId === userId).sort((a, b) => b.timestamp - a.timestamp)
}

function saveLog(client, log) {
  const guildId = log.guildId
  const guildLogs = client.modlogs.get(guildId) || []
  guildLogs.push(log)
  client.modlogs.set(guildId, guildLogs)
}

function deleteLog(client, guildId, logId) {
  const guildLogs = client.modlogs.get(guildId) || []
  const initialLength = guildLogs.length

  const newLogs = guildLogs.filter((log) => log.id !== logId)
  client.modlogs.set(guildId, newLogs)

  return newLogs.length < initialLength
}

function getLogChannel(client, guildId) {
  return client.modlogsConfig.get(guildId)
}

function setLogChannel(client, guildId, channelId) {
  client.modlogsConfig.set(guildId, channelId)
}

function generateLogId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

function getActionEmoji(type) {
  switch (type) {
    case "warn":
      return "⚠️"
    case "kick":
      return "👢"
    case "tempban":
      return "⏱️"
    case "ban":
      return "🔨"
    case "mute":
      return "🔇"
    case "note":
      return "📝"
    default:
      return "❓"
  }
}

function getActionName(type) {
  switch (type) {
    case "warn":
      return "Advertencia"
    case "kick":
      return "Expulsión"
    case "tempban":
      return "Baneo Temporal"
    case "ban":
      return "Baneo"
    case "mute":
      return "Silencio"
    case "note":
      return "Nota"
    default:
      return "Desconocido"
  }
}

function getActionColor(type) {
  switch (type) {
    case "warn":
      return colors.warning
    case "kick":
      return "#FF9900"
    case "tempban":
      return "#FF6600"
    case "ban":
      return colors.error
    case "mute":
      return "#9966CC"
    case "note":
      return colors.info
    default:
      return colors.primary
  }
}
