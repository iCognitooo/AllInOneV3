const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const { colors } = require("../../config.json")
const moment = require("moment")
moment.locale("es")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Muestra información detallada sobre un usuario")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuario del que quieres ver la información").setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply()

    const targetUser = interaction.options.getUser("usuario") || interaction.user
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

    if (!member) {
      return interaction.editReply({
        content: `No pude encontrar información sobre ${targetUser.tag} en este servidor.`,
        ephemeral: true,
      })
    }

    // Obtener roles (excluyendo @everyone)
    const roles = member.roles.cache
      .filter((role) => role.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString())

    // Calcular fechas
    const joinedAt = moment(member.joinedAt).format("LL")
    const joinedAtRelative = moment(member.joinedAt).fromNow()
    const createdAt = moment(targetUser.createdAt).format("LL")
    const createdAtRelative = moment(targetUser.createdAt).fromNow()

    // Determinar estado y dispositivo
    const status = getStatusText(member.presence?.status)
    const devices = getDevices(member.presence?.clientStatus)

    // Determinar permisos clave
    const keyPermissions = getKeyPermissions(member)

    // Crear embed
    const embed = new EmbedBuilder()
      .setTitle(`Información de ${targetUser.tag}`)
      .setColor(member.displayHexColor === "#000000" ? colors.primary : member.displayHexColor)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "📋 ID", value: targetUser.id, inline: true },
        { name: "🏷️ Apodo", value: member.nickname || "Ninguno", inline: true },
        { name: "🤖 Bot", value: targetUser.bot ? "Sí" : "No", inline: true },
        { name: "📅 Cuenta creada", value: `${createdAt}\n(${createdAtRelative})`, inline: false },
        { name: "📥 Se unió al servidor", value: `${joinedAt}\n(${joinedAtRelative})`, inline: false },
      )
      .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()

    // Añadir estado si está disponible
    if (member.presence) {
      embed.addFields({
        name: "🔵 Estado",
        value: `${status}${devices ? `\nDispositivos: ${devices}` : ""}`,
        inline: false,
      })
    }

    // Añadir actividad si está disponible
    if (member.presence?.activities?.length > 0) {
      const activities = member.presence.activities
        .map((activity) => {
          let text = `**${activity.type === "CUSTOM_STATUS" ? "Estado personalizado" : activity.type.charAt(0) + activity.type.slice(1).toLowerCase()}**: `

          if (activity.type === "CUSTOM_STATUS") {
            text += activity.state || "Sin texto"
          } else {
            text += activity.name
            if (activity.details) text += `\n${activity.details}`
          }

          return text
        })
        .join("\n\n")

      embed.addFields({ name: "🎮 Actividad", value: activities, inline: false })
    }

    // Añadir roles si tiene
    if (roles.length > 0) {
      embed.addFields({
        name: `🏅 Roles [${roles.length}]`,
        value: roles.length < 10 ? roles.join(" ") : `${roles.slice(0, 10).join(" ")} y ${roles.length - 10} más...`,
        inline: false,
      })
    } else {
      embed.addFields({ name: "🏅 Roles", value: "Ninguno", inline: false })
    }

    // Añadir permisos clave si tiene
    if (keyPermissions.length > 0) {
      embed.addFields({ name: "🔑 Permisos clave", value: keyPermissions.join(", "), inline: false })
    }

    await interaction.editReply({ embeds: [embed] })
  },
}

function getStatusText(status) {
  if (!status) return "Desconocido"

  const statusMap = {
    online: "🟢 En línea",
    idle: "🟡 Ausente",
    dnd: "🔴 No molestar",
    offline: "⚫ Desconectado/Invisible",
  }

  return statusMap[status] || "Desconocido"
}

function getDevices(clientStatus) {
  if (!clientStatus) return null

  const devices = []
  if (clientStatus.desktop) devices.push("💻 PC")
  if (clientStatus.mobile) devices.push("📱 Móvil")
  if (clientStatus.web) devices.push("🌐 Web")

  return devices.length > 0 ? devices.join(", ") : null
}

function getKeyPermissions(member) {
  const keyPermissionFlags = [
    { flag: PermissionFlagsBits.Administrator, name: "Administrador" },
    { flag: PermissionFlagsBits.ManageGuild, name: "Gestionar Servidor" },
    { flag: PermissionFlagsBits.BanMembers, name: "Banear Miembros" },
    { flag: PermissionFlagsBits.KickMembers, name: "Expulsar Miembros" },
    { flag: PermissionFlagsBits.ManageChannels, name: "Gestionar Canales" },
    { flag: PermissionFlagsBits.ManageRoles, name: "Gestionar Roles" },
    { flag: PermissionFlagsBits.MentionEveryone, name: "Mencionar @everyone" },
    { flag: PermissionFlagsBits.ManageMessages, name: "Gestionar Mensajes" },
    { flag: PermissionFlagsBits.MuteMembers, name: "Silenciar Miembros" },
    { flag: PermissionFlagsBits.DeafenMembers, name: "Ensordecer Miembros" },
    { flag: PermissionFlagsBits.MoveMembers, name: "Mover Miembros" },
  ]

  return keyPermissionFlags.filter((perm) => member.permissions.has(perm.flag)).map((perm) => perm.name)
}
