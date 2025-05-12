const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Gestiona los roles del servidor")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Muestra información sobre un rol")
        .addRoleOption((option) =>
          option.setName("rol").setDescription("El rol del que quieres ver información").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Muestra una lista de todos los roles del servidor"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("members")
        .setDescription("Muestra los miembros que tienen un rol específico")
        .addRoleOption((option) =>
          option.setName("rol").setDescription("El rol del que quieres ver los miembros").setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "info") {
      await handleRoleInfo(interaction)
    } else if (subcommand === "list") {
      await handleRoleList(interaction)
    } else if (subcommand === "members") {
      await handleRoleMembers(interaction)
    }
  },
}

async function handleRoleInfo(interaction) {
  await interaction.deferReply()

  const role = interaction.options.getRole("rol")

  // Obtener información del rol
  const createdAt = new Date(role.createdTimestamp)
  const hexColor = role.hexColor
  const isHoist = role.hoist ? "Sí" : "No"
  const isMentionable = role.mentionable ? "Sí" : "No"
  const isManaged = role.managed ? "Sí" : "No"
  const position = role.position

  // Contar miembros con este rol
  const membersWithRole = role.members.size

  // Crear embed
  const embed = new EmbedBuilder()
    .setTitle(`Información del Rol: ${role.name}`)
    .setColor(hexColor)
    .addFields(
      { name: "📋 ID", value: role.id, inline: true },
      { name: "🎨 Color", value: hexColor, inline: true },
      { name: "📊 Posición", value: `${position}`, inline: true },
      { name: "👥 Miembros", value: `${membersWithRole}`, inline: true },
      { name: "📅 Creado el", value: `<t:${Math.floor(createdAt.getTime() / 1000)}:F>`, inline: true },
      { name: "🔍 Separado", value: isHoist, inline: true },
      { name: "💬 Mencionable", value: isMentionable, inline: true },
      { name: "⚙️ Gestionado", value: isManaged, inline: true },
    )
    .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp()

  // Añadir permisos si no son demasiados
  const permissions = role.permissions.toArray()
  if (permissions.length > 0) {
    const formattedPermissions = permissions.map((perm) => `\`${formatPermission(perm)}\``).join(", ")

    embed.addFields({ name: "🔑 Permisos", value: formattedPermissions })
  }

  await interaction.editReply({ embeds: [embed] })
}

async function handleRoleList(interaction) {
  await interaction.deferReply()

  // Obtener todos los roles del servidor (excepto @everyone)
  const roles = interaction.guild.roles.cache
    .filter((role) => role.id !== interaction.guild.id)
    .sort((a, b) => b.position - a.position)

  if (roles.size === 0) {
    return interaction.editReply("Este servidor no tiene roles adicionales.")
  }

  // Agrupar roles por categorías
  const managedRoles = roles.filter((role) => role.managed)
  const colorRoles = roles.filter((role) => !role.managed && role.color !== 0)
  const normalRoles = roles.filter((role) => !role.managed && role.color === 0)

  // Crear embed
  const embed = new EmbedBuilder()
    .setTitle(`Roles del Servidor: ${interaction.guild.name}`)
    .setColor(colors.primary)
    .setDescription(`Este servidor tiene **${roles.size}** roles.`)
    .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp()

  // Añadir roles gestionados si hay
  if (managedRoles.size > 0) {
    embed.addFields({
      name: `⚙️ Roles Gestionados (${managedRoles.size})`,
      value: managedRoles.map((role) => `<@&${role.id}>`).join(" "),
    })
  }

  // Añadir roles de color si hay
  if (colorRoles.size > 0) {
    embed.addFields({
      name: `🎨 Roles de Color (${colorRoles.size})`,
      value: colorRoles.map((role) => `<@&${role.id}>`).join(" "),
    })
  }

  // Añadir roles normales si hay
  if (normalRoles.size > 0) {
    embed.addFields({
      name: `📋 Roles Normales (${normalRoles.size})`,
      value: normalRoles.map((role) => `<@&${role.id}>`).join(" "),
    })
  }

  await interaction.editReply({ embeds: [embed] })
}

async function handleRoleMembers(interaction) {
  await interaction.deferReply()

  const role = interaction.options.getRole("rol")
  const members = role.members

  if (members.size === 0) {
    return interaction.editReply(`No hay miembros con el rol ${role}.`)
  }

  // Crear embed
  const embed = new EmbedBuilder()
    .setTitle(`Miembros con el Rol: ${role.name}`)
    .setColor(role.hexColor)
    .setDescription(`Hay **${members.size}** miembros con este rol.`)
    .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp()

  // Si hay demasiados miembros, mostrar solo algunos
  if (members.size <= 20) {
    const memberList = members.map((member) => `${member} (${member.user.tag})`).join("\n")
    embed.addFields({ name: "👥 Miembros", value: memberList })
  } else {
    const firstMembers = Array.from(members.values())
      .slice(0, 20)
      .map((member) => `${member} (${member.user.tag})`)
      .join("\n")

    embed.addFields(
      { name: `👥 Primeros 20 Miembros (de ${members.size})`, value: firstMembers },
      { name: "⚠️ Nota", value: `Solo se muestran los primeros 20 miembros de ${members.size} totales.` },
    )
  }

  await interaction.editReply({ embeds: [embed] })
}

// Función para formatear nombres de permisos
function formatPermission(permission) {
  return permission
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
