const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js")
const { createCanvas, loadImage, registerFont } = require("canvas")
const { colors } = require("../../config.json")
const { getGuildSettings, updateGuildSettings } = require("../../utils/database")
const path = require("path")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome-card")
    .setDescription("Configura tarjetas de bienvenida personalizadas")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("configurar")
        .setDescription("Configura la tarjeta de bienvenida")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Canal donde se enviarán las tarjetas de bienvenida")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("mensaje")
            .setDescription("Mensaje de bienvenida (usa {user}, {server}, {count})")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("color").setDescription("Color principal de la tarjeta (hex)").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("fondo").setDescription("URL de la imagen de fondo").setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("estilo")
            .setDescription("Estilo de la tarjeta")
            .setRequired(false)
            .addChoices(
              { name: "Moderno", value: "modern" },
              { name: "Minimalista", value: "minimal" },
              { name: "Elegante", value: "elegant" },
              { name: "Vibrante", value: "vibrant" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("previsualizar").setDescription("Previsualiza la tarjeta de bienvenida actual"),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("desactivar").setDescription("Desactiva las tarjetas de bienvenida"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 10,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "configurar") {
      await handleConfigureWelcomeCard(interaction)
    } else if (subcommand === "previsualizar") {
      await handlePreviewWelcomeCard(interaction)
    } else if (subcommand === "desactivar") {
      await handleDisableWelcomeCard(interaction)
    }
  },
}

async function handleConfigureWelcomeCard(interaction) {
  await interaction.deferReply()

  const channel = interaction.options.getChannel("canal")
  const message = interaction.options.getString("mensaje") || "¡Bienvenido {user} a {server}!"
  const color = interaction.options.getString("color") || "#5865F2"
  const background = interaction.options.getString("fondo")
  const style = interaction.options.getString("estilo") || "modern"

  // Guardar configuración
  const settings = {
    welcome_channel: channel.id,
    welcome_message: message,
    welcome_card_color: color,
    welcome_card_background: background,
    welcome_card_style: style,
    welcome_card_enabled: 1,
  }

  await updateGuildSettings(interaction.guild.id, settings)

  // Generar tarjeta de ejemplo
  const welcomeCard = await generateWelcomeCard(interaction.user, interaction.guild, message, color, background, style)

  // Crear embed de confirmación
  const embed = new EmbedBuilder()
    .setTitle("✅ Tarjeta de Bienvenida Configurada")
    .setDescription(`Las tarjetas de bienvenida se enviarán a ${channel}.`)
    .addFields(
      { name: "Mensaje", value: message, inline: false },
      { name: "Color", value: color, inline: true },
      { name: "Estilo", value: style, inline: true },
    )
    .setColor(color)
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setTimestamp()

  if (background) {
    embed.addFields({ name: "Fondo", value: "Imagen personalizada", inline: true })
  }

  await interaction.editReply({
    embeds: [embed],
    files: [welcomeCard],
  })
}

async function handlePreviewWelcomeCard(interaction) {
  await interaction.deferReply()

  // Obtener configuración actual
  const settings = await getGuildSettings(interaction.guild.id)

  if (!settings || !settings.welcome_card_enabled) {
    return interaction.editReply("Las tarjetas de bienvenida no están configuradas en este servidor.")
  }

  // Generar tarjeta de ejemplo
  const welcomeCard = await generateWelcomeCard(
    interaction.user,
    interaction.guild,
    settings.welcome_message || "¡Bienvenido {user} a {server}!",
    settings.welcome_card_color || "#5865F2",
    settings.welcome_card_background,
    settings.welcome_card_style || "modern",
  )

  // Crear embed de previsualización
  const embed = new EmbedBuilder()
    .setTitle("🖼️ Previsualización de Tarjeta de Bienvenida")
    .setDescription("Así es como se verá la tarjeta de bienvenida cuando un nuevo miembro se una al servidor.")
    .setColor(settings.welcome_card_color || "#5865F2")
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setTimestamp()

  await interaction.editReply({
    embeds: [embed],
    files: [welcomeCard],
  })
}

async function handleDisableWelcomeCard(interaction) {
  // Desactivar tarjetas de bienvenida
  await updateGuildSettings(interaction.guild.id, {
    welcome_card_enabled: 0,
  })

  // Crear embed de confirmación
  const embed = new EmbedBuilder()
    .setTitle("✅ Tarjetas de Bienvenida Desactivadas")
    .setDescription("Las tarjetas de bienvenida han sido desactivadas.")
    .setColor(colors.success)
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}

async function generateWelcomeCard(user, guild, message, color, backgroundUrl, style) {
  // Configuración del canvas según el estilo
  let width, height

  switch (style) {
    case "minimal":
      width = 800
      height = 250
      break
    case "elegant":
      width = 1000
      height = 300
      break
    case "vibrant":
      width = 900
      height = 400
      break
    case "modern":
    default:
      width = 1000
      height = 360
      break
  }

  // Crear canvas
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")

  // Cargar fondo
  try {
    let background

    if (backgroundUrl) {
      // Usar fondo personalizado
      background = await loadImage(backgroundUrl)
    } else {
      // Usar fondo predeterminado según el estilo
      switch (style) {
        case "minimal":
          // Fondo sólido para minimalista
          ctx.fillStyle = "#2F3136"
          ctx.fillRect(0, 0, width, height)
          break
        case "elegant":
          // Fondo degradado para elegante
          const gradient = ctx.createLinearGradient(0, 0, width, height)
          gradient.addColorStop(0, "#2C2F33")
          gradient.addColorStop(1, "#23272A")
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, width, height)
          break
        case "vibrant":
          // Fondo vibrante
          const vibrantGradient = ctx.createLinearGradient(0, 0, width, height)
          vibrantGradient.addColorStop(0, "#8A2387")
          vibrantGradient.addColorStop(0.5, "#E94057")
          vibrantGradient.addColorStop(1, "#F27121")
          ctx.fillStyle = vibrantGradient
          ctx.fillRect(0, 0, width, height)
          break
        case "modern":
        default:
          // Fondo moderno
          ctx.fillStyle = "#36393F"
          ctx.fillRect(0, 0, width, height)

          // Añadir formas geométricas
          ctx.globalAlpha = 0.1
          ctx.fillStyle = color

          // Círculos decorativos
          ctx.beginPath()
          ctx.arc(width * 0.8, height * 0.2, 100, 0, Math.PI * 2)
          ctx.fill()

          ctx.beginPath()
          ctx.arc(width * 0.1, height * 0.8, 80, 0, Math.PI * 2)
          ctx.fill()

          ctx.globalAlpha = 1
          break
      }
    }

    if (background) {
      // Dibujar imagen de fondo
      ctx.drawImage(background, 0, 0, width, height)

      // Añadir capa de oscurecimiento para mejorar legibilidad
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
      ctx.fillRect(0, 0, width, height)
    }
  } catch (error) {
    console.error("Error al cargar el fondo:", error)
    // Fondo de respaldo
    ctx.fillStyle = "#36393F"
    ctx.fillRect(0, 0, width, height)
  }

  // Dibujar elementos según el estilo
  switch (style) {
    case "minimal":
      await drawMinimalStyle(ctx, user, guild, message, color, width, height)
      break
    case "elegant":
      await drawElegantStyle(ctx, user, guild, message, color, width, height)
      break
    case "vibrant":
      await drawVibrantStyle(ctx, user, guild, message, color, width, height)
      break
    case "modern":
    default:
      await drawModernStyle(ctx, user, guild, message, color, width, height)
      break
  }

  // Convertir canvas a buffer
  const buffer = canvas.toBuffer()
  return new AttachmentBuilder(buffer, { name: "welcome-card.png" })
}

async function drawModernStyle(ctx, user, guild, message, color, width, height) {
  // Cargar avatar
  const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 256 }))

  // Dibujar avatar con borde
  const avatarSize = 150
  const avatarX = 75
  const avatarY = height / 2 - avatarSize / 2

  // Borde del avatar
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()

  // Avatar circular
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
  ctx.restore()

  // Dibujar línea decorativa
  ctx.beginPath()
  ctx.moveTo(avatarX + avatarSize + 20, height / 2)
  ctx.lineTo(width - 50, height / 2)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()

  // Texto de bienvenida
  const formattedMessage = message
    .replace(/{user}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{count}/g, guild.memberCount)

  // Título
  ctx.font = "bold 50px Arial"
  ctx.fillStyle = "#FFFFFF"
  ctx.textAlign = "left"
  ctx.fillText("¡BIENVENIDO!", avatarX + avatarSize + 40, height / 2 - 30)

  // Mensaje
  ctx.font = "30px Arial"
  ctx.fillStyle = "#E0E0E0"
  ctx.fillText(formattedMessage, avatarX + avatarSize + 40, height / 2 + 30)

  // Miembro #
  ctx.font = "20px Arial"
  ctx.fillStyle = "#B9BBBE"
  ctx.fillText(`Miembro #${guild.memberCount}`, avatarX + avatarSize + 40, height / 2 + 70)

  // Nombre del servidor
  ctx.font = "bold 25px Arial"
  ctx.fillStyle = color
  ctx.textAlign = "right"
  ctx.fillText(guild.name, width - 50, height - 30)
}

async function drawMinimalStyle(ctx, user, guild, message, color, width, height) {
  // Cargar avatar
  const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 256 }))

  // Avatar cuadrado con bordes redondeados
  const avatarSize = 100
  const avatarX = 50
  const avatarY = height / 2 - avatarSize / 2

  // Dibujar avatar con bordes redondeados
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 10)
  ctx.clip()
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
  ctx.restore()

  // Texto de bienvenida
  const formattedMessage = message
    .replace(/{user}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{count}/g, guild.memberCount)

  // Mensaje
  ctx.font = "bold 30px Arial"
  ctx.fillStyle = "#FFFFFF"
  ctx.textAlign = "left"
  ctx.fillText(formattedMessage, avatarX + avatarSize + 30, height / 2)

  // Línea minimalista
  ctx.beginPath()
  ctx.moveTo(avatarX + avatarSize + 30, height / 2 + 20)
  ctx.lineTo(avatarX + avatarSize + 230, height / 2 + 20)
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.stroke()
}

async function drawElegantStyle(ctx, user, guild, message, color, width, height) {
  // Cargar avatar
  const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 256 }))

  // Dibujar marco decorativo
  ctx.strokeStyle = color
  ctx.lineWidth = 8
  ctx.strokeRect(20, 20, width - 40, height - 40)

  // Dibujar avatar
  const avatarSize = 180
  const avatarX = width / 2 - avatarSize / 2
  const avatarY = 60

  // Avatar circular con borde
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
  ctx.restore()

  // Texto de bienvenida
  const formattedMessage = message
    .replace(/{user}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{count}/g, guild.memberCount)

  // Título elegante
  ctx.font = "bold 40px Arial"
  ctx.fillStyle = "#FFFFFF"
  ctx.textAlign = "center"
  ctx.fillText(user.username, width / 2, avatarY + avatarSize + 50)

  // Mensaje
  ctx.font = "italic 30px Arial"
  ctx.fillStyle = "#E0E0E0"
  ctx.fillText(formattedMessage, width / 2, avatarY + avatarSize + 100)

  // Nombre del servidor
  ctx.font = "bold 25px Arial"
  ctx.fillStyle = color
  ctx.fillText(guild.name, width / 2, height - 40)
}

async function drawVibrantStyle(ctx, user, guild, message, color, width, height) {
  // Cargar avatar
  const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 256 }))

  // Dibujar formas vibrantes
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const size = 50 + Math.random() * 100

    ctx.save()
    ctx.globalAlpha = 0.1
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = "#FFFFFF"
    ctx.fill()
    ctx.restore()
  }

  // Dibujar avatar
  const avatarSize = 150
  const avatarX = 100
  const avatarY = height / 2 - avatarSize / 2

  // Efecto de brillo
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = 20
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2)
  ctx.fillStyle = "#FFFFFF"
  ctx.fill()
  ctx.restore()

  // Avatar circular
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
  ctx.restore()

  // Texto de bienvenida
  const formattedMessage = message
    .replace(/{user}/g, user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{count}/g, guild.memberCount)

  // Título vibrante
  ctx.font = "bold 60px Arial"
  ctx.fillStyle = "#FFFFFF"
  ctx.textAlign = "left"
  ctx.fillText("¡BIENVENIDO!", avatarX + avatarSize + 40, height / 2 - 20)

  // Mensaje
  ctx.font = "30px Arial"
  ctx.fillStyle = "#FFFFFF"
  ctx.fillText(formattedMessage, avatarX + avatarSize + 40, height / 2 + 30)

  // Nombre del usuario
  ctx.font = "bold 35px Arial"
  ctx.fillStyle = "#FFFFFF"
  ctx.textAlign = "center"
  ctx.fillText(user.username, width / 2, height - 50)

  // Efecto de brillo para el nombre
  ctx.shadowColor = color
  ctx.shadowBlur = 15
  ctx.fillText(user.username, width / 2, height - 50)
  ctx.shadowBlur = 0
}
