const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js")
const { ChartJSNodeCanvas } = require("chartjs-node-canvas")
const { colors } = require("../../config.json")
const os = require("os")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats-avanzado")
    .setDescription("Muestra estadísticas avanzadas del servidor y del bot")
    .addSubcommand((subcommand) =>
      subcommand.setName("servidor").setDescription("Estadísticas detalladas del servidor"),
    )
    .addSubcommand((subcommand) => subcommand.setName("bot").setDescription("Estadísticas del rendimiento del bot"))
    .addSubcommand((subcommand) =>
      subcommand.setName("miembros").setDescription("Análisis de los miembros del servidor"),
    ),
  cooldown: 15,
  async execute(interaction) {
    await interaction.deferReply()

    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "servidor") {
      await handleServerStats(interaction)
    } else if (subcommand === "bot") {
      await handleBotStats(interaction)
    } else if (subcommand === "miembros") {
      await handleMemberStats(interaction)
    }
  },
}

async function handleServerStats(interaction) {
  const { guild } = interaction

  // Recopilar datos del servidor
  const owner = await guild.fetchOwner()
  const createdAt = Math.floor(guild.createdTimestamp / 1000)
  const boostLevel = guild.premiumTier
  const boostCount = guild.premiumSubscriptionCount

  // Contar canales por tipo
  const textChannels = guild.channels.cache.filter((c) => c.type === 0).size
  const voiceChannels = guild.channels.cache.filter((c) => c.type === 2).size
  const categoryChannels = guild.channels.cache.filter((c) => c.type === 4).size
  const forumChannels = guild.channels.cache.filter((c) => c.type === 15).size

  // Contar roles por permisos
  const adminRoles = guild.roles.cache.filter((r) => r.permissions.has("Administrator")).size
  const modRoles = guild.roles.cache.filter(
    (r) => !r.permissions.has("Administrator") && (r.permissions.has("KickMembers") || r.permissions.has("BanMembers")),
  ).size

  // Crear gráfico de canales
  const width = 400
  const height = 300
  const chartCallback = (ChartJS) => {
    ChartJS.defaults.font.family = "Arial"
    ChartJS.defaults.font.size = 14
    ChartJS.defaults.color = "#FFFFFF"
  }

  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback })

  const channelData = {
    labels: ["Texto", "Voz", "Categorías", "Foros"],
    datasets: [
      {
        label: "Canales",
        data: [textChannels, voiceChannels, categoryChannels, forumChannels],
        backgroundColor: [
          "rgba(54, 162, 235, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 159, 64, 0.6)",
          "rgba(153, 102, 255, 0.6)",
        ],
        borderColor: [
          "rgba(54, 162, 235, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  }

  const chartConfig = {
    type: "pie",
    data: channelData,
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#FFFFFF",
          },
        },
        title: {
          display: true,
          text: "Distribución de Canales",
          color: "#FFFFFF",
        },
      },
    },
  }

  const chartBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig)
  const chartAttachment = new AttachmentBuilder(chartBuffer, { name: "chart.png" })

  // Crear embed principal
  const embed = new EmbedBuilder()
    .setTitle(`📊 Estadísticas Avanzadas de ${guild.name}`)
    .setDescription(`Análisis detallado del servidor.`)
    .addFields(
      { name: "👑 Propietario", value: `${owner.user.tag}`, inline: true },
      { name: "📆 Creado", value: `<t:${createdAt}:R>`, inline: true },
      { name: "🆔 ID", value: guild.id, inline: true },
      { name: "👥 Miembros", value: `${guild.memberCount} miembros`, inline: true },
      { name: "📈 Nivel de Boost", value: `Nivel ${boostLevel} (${boostCount} boosts)`, inline: true },
      { name: "🔐 Verificación", value: guild.verificationLevel.toString(), inline: true },
      {
        name: "📚 Canales",
        value: `${guild.channels.cache.size} canales en total\n${textChannels} de texto\n${voiceChannels} de voz\n${categoryChannels} categorías\n${forumChannels} foros`,
        inline: true,
      },
      {
        name: "🏷️ Roles",
        value: `${guild.roles.cache.size} roles en total\n${adminRoles} con permisos de admin\n${modRoles} con permisos de moderación`,
        inline: true,
      },
      {
        name: "😀 Emojis",
        value: `${guild.emojis.cache.size} emojis\n${guild.emojis.cache.filter((e) => e.animated).size} animados`,
        inline: true,
      },
    )
    .setColor(colors.primary)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
    .setImage("attachment://chart.png")
    .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp()

  await interaction.editReply({ embeds: [embed], files: [chartAttachment] })
}

async function handleBotStats(interaction) {
  const client = interaction.client

  // Estadísticas del bot
  const uptime = Math.floor(client.uptime / 1000)
  const memoryUsage = process.memoryUsage()
  const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
  const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)

  // Estadísticas del sistema
  const osUptime = Math.floor(os.uptime())
  const cpuCount = os.cpus().length
  const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024)
  const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024)
  const usedMemoryMB = totalMemoryMB - freeMemoryMB
  const memoryPercentage = Math.round((usedMemoryMB / totalMemoryMB) * 100)

  // Estadísticas de Discord
  const guildCount = client.guilds.cache.size
  const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
  const channelCount = client.channels.cache.size
  const commandCount = client.commands.size

  // Crear gráfico de memoria
  const width = 400
  const height = 300
  const chartCallback = (ChartJS) => {
    ChartJS.defaults.font.family = "Arial"
    ChartJS.defaults.font.size = 14
    ChartJS.defaults.color = "#FFFFFF"
  }

  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback })

  const memoryData = {
    labels: ["Usado", "Libre"],
    datasets: [
      {
        label: "Memoria del Sistema (MB)",
        data: [usedMemoryMB, freeMemoryMB],
        backgroundColor: ["rgba(255, 99, 132, 0.6)", "rgba(75, 192, 192, 0.6)"],
        borderColor: ["rgba(255, 99, 132, 1)", "rgba(75, 192, 192, 1)"],
        borderWidth: 1,
      },
    ],
  }

  const chartConfig = {
    type: "doughnut",
    data: memoryData,
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#FFFFFF",
          },
        },
        title: {
          display: true,
          text: "Uso de Memoria del Sistema",
          color: "#FFFFFF",
        },
      },
    },
  }

  const chartBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig)
  const chartAttachment = new AttachmentBuilder(chartBuffer, { name: "memory-chart.png" })

  // Crear embed
  const embed = new EmbedBuilder()
    .setTitle("⚙️ Estadísticas del Bot")
    .setDescription(`Información detallada sobre el rendimiento y recursos del bot.`)
    .addFields(
      {
        name: "⏱️ Tiempo de Actividad",
        value: `Bot: <t:${Math.floor(Date.now() / 1000 - uptime)}:R>\nSistema: <t:${Math.floor(Date.now() / 1000 - osUptime)}:R>`,
        inline: true,
      },
      { name: "🧠 Memoria del Bot", value: `${memoryUsedMB} MB / ${memoryTotalMB} MB`, inline: true },
      { name: "💻 Sistema", value: `${os.platform()} ${os.release()}\n${cpuCount} CPU cores`, inline: true },
      {
        name: "🖥️ Memoria del Sistema",
        value: `${usedMemoryMB} MB / ${totalMemoryMB} MB (${memoryPercentage}%)`,
        inline: true,
      },
      { name: "🌐 Servidores", value: `${guildCount} servidores`, inline: true },
      { name: "👥 Usuarios", value: `${userCount} usuarios`, inline: true },
      { name: "📊 Estadísticas", value: `${channelCount} canales\n${commandCount} comandos`, inline: true },
      { name: "📡 Ping", value: `${client.ws.ping} ms`, inline: true },
      { name: "🔧 Versión", value: `Node.js ${process.version}\nDiscord.js v14`, inline: true },
    )
    .setColor(colors.primary)
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setImage("attachment://memory-chart.png")
    .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp()

  await interaction.editReply({ embeds: [embed], files: [chartAttachment] })
}

async function handleMemberStats(interaction) {
  const { guild } = interaction

  await guild.members.fetch()

  // Estadísticas de miembros
  const totalMembers = guild.memberCount
  const humans = guild.members.cache.filter((member) => !member.user.bot).size
  const bots = guild.members.cache.filter((member) => member.user.bot).size
  const online = guild.members.cache.filter((member) => member.presence?.status === "online").size
  const idle = guild.members.cache.filter((member) => member.presence?.status === "idle").size
  const dnd = guild.members.cache.filter((member) => member.presence?.status === "dnd").size
  const offline = totalMembers - online - idle - dnd

  // Contar miembros por roles (top 5)
  const roleCountMap = new Map()
  guild.members.cache.forEach((member) => {
    member.roles.cache.forEach((role) => {
      if (role.id !== guild.id) {
        // Ignorar el rol @everyone
        const count = roleCountMap.get(role.id) || 0
        roleCountMap.set(role.id, count + 1)
      }
    })
  })

  const topRoles = [...roleCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([roleId, count]) => {
      const role = guild.roles.cache.get(roleId)
      return { name: role.name, count, color: role.hexColor }
    })

  // Crear gráfico de miembros
  const width = 400
  const height = 300
  const chartCallback = (ChartJS) => {
    ChartJS.defaults.font.family = "Arial"
    ChartJS.defaults.font.size = 14
    ChartJS.defaults.color = "#FFFFFF"
  }

  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback })

  const memberData = {
    labels: ["En línea", "Ausente", "No molestar", "Desconectado"],
    datasets: [
      {
        label: "Estado de Miembros",
        data: [online, idle, dnd, offline],
        backgroundColor: [
          "rgba(67, 181, 129, 0.6)",
          "rgba(250, 166, 26, 0.6)",
          "rgba(240, 71, 71, 0.6)",
          "rgba(116, 127, 141, 0.6)",
        ],
        borderColor: [
          "rgba(67, 181, 129, 1)",
          "rgba(250, 166, 26, 1)",
          "rgba(240, 71, 71, 1)",
          "rgba(116, 127, 141, 1)",
        ],
        borderWidth: 1,
      },
    ],
  }

  const chartConfig = {
    type: "bar",
    data: memberData,
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#FFFFFF",
          },
        },
        title: {
          display: true,
          text: "Estado de Miembros",
          color: "#FFFFFF",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#FFFFFF",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "#FFFFFF",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
    },
  }

  const chartBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig)
  const chartAttachment = new AttachmentBuilder(chartBuffer, { name: "member-chart.png" })

  // Crear gráfico de roles
  const roleData = {
    labels: topRoles.map((r) => r.name),
    datasets: [
      {
        label: "Miembros por Rol",
        data: topRoles.map((r) => r.count),
        backgroundColor: topRoles.map((r) => (r.color !== "#000000" ? r.color + "99" : "rgba(153, 170, 181, 0.6)")),
        borderColor: topRoles.map((r) => (r.color !== "#000000" ? r.color : "rgba(153, 170, 181, 1)")),
        borderWidth: 1,
      },
    ],
  }

  const roleChartConfig = {
    type: "pie",
    data: roleData,
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#FFFFFF",
          },
        },
        title: {
          display: true,
          text: "Top 5 Roles",
          color: "#FFFFFF",
        },
      },
    },
  }

  const roleChartBuffer = await chartJSNodeCanvas.renderToBuffer(roleChartConfig)
  const roleChartAttachment = new AttachmentBuilder(roleChartBuffer, { name: "role-chart.png" })

  // Crear embed
  const embed = new EmbedBuilder()
    .setTitle(`👥 Análisis de Miembros de ${guild.name}`)
    .setDescription(`Estadísticas detalladas sobre los miembros del servidor.`)
    .addFields(
      {
        name: "📊 Total de Miembros",
        value: `${totalMembers} miembros\n${humans} humanos\n${bots} bots`,
        inline: true,
      },
      { name: "🟢 En línea", value: `${online} miembros`, inline: true },
      { name: "🟠 Ausente", value: `${idle} miembros`, inline: true },
      { name: "🔴 No molestar", value: `${dnd} miembros`, inline: true },
      { name: "⚫ Desconectado", value: `${offline} miembros`, inline: true },
      { name: "📈 Tasa de Bots", value: `${Math.round((bots / totalMembers) * 100)}%`, inline: true },
      { name: "🏆 Roles Principales", value: topRoles.map((r) => `${r.name}: ${r.count} miembros`).join("\n") },
    )
    .setColor(colors.primary)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
    .setImage("attachment://member-chart.png")
    .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp()

  await interaction.editReply({ embeds: [embed], files: [chartAttachment, roleChartAttachment] })
}
