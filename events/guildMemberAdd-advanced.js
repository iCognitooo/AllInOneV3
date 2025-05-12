const { EmbedBuilder, AttachmentBuilder } = require("discord.js")
const { createCanvas, loadImage } = require("canvas")
const { getGuildSettings } = require("../utils/database")
const path = require("path")

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    try {
      const { guild, user } = member

      // Obtener configuración del servidor
      const settings = await getGuildSettings(guild.id)

      // Verificar si el sistema de bienvenida está configurado
      if (settings && settings.welcome_channel) {
        const welcomeChannel = await guild.channels.fetch(settings.welcome_channel).catch(() => null)

        if (welcomeChannel) {
          // Verificar si se deben usar tarjetas de bienvenida
          if (settings.welcome_card_enabled) {
            await handleWelcomeCard(member, settings, welcomeChannel)
          } else {
            // Usar mensaje de bienvenida normal
            await handleWelcomeMessage(member, settings, welcomeChannel)
          }
        }
      }

      // Asignar rol automático si está configurado
      if (settings && settings.autorole_id) {
        const role = await guild.roles.fetch(settings.autorole_id).catch(() => null)
        if (role && role.editable) {
          await member.roles.add(role)
        }
      }

      // Enviar mensaje de bienvenida por DM si está configurado
      if (settings && settings.welcome_dm_enabled && settings.welcome_dm_message) {
        try {
          const dmMessage = settings.welcome_dm_message
            .replace(/{user}/g, user)
            .replace(/{server}/g, guild.name)
            .replace(/{count}/g, guild.memberCount)

          const dmEmbed = new EmbedBuilder()
            .setTitle(`¡Bienvenido a ${guild.name}!`)
            .setDescription(dmMessage)
            .setColor(settings.welcome_color || "#5865F2")
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: guild.name, iconURL: guild.iconURL() })
            .setTimestamp()

          await user.send({ embeds: [dmEmbed] })
        } catch (error) {
          console.error("Error al enviar DM de bienvenida:", error)
        }
      }

      // Registrar entrada en la base de datos (simulado)
      console.log(`[MEMBER JOIN] ${user.tag} (${user.id}) se unió a ${guild.name} (${guild.id})`)
    } catch (error) {
      console.error("Error en evento guildMemberAdd:", error)
    }
  },
}

async function handleWelcomeMessage(member, settings, channel) {
  const { guild, user } = member

  // Preparar mensaje de bienvenida
  const welcomeMessage = settings.welcome_message || "¡Bienvenido {user} a **{server}**!"
  const formattedMessage = welcomeMessage
    .replace(/{user}/g, user)
    .replace(/{server}/g, guild.name)
    .replace(/{count}/g, guild.memberCount)

  // Enviar mensaje según configuración
  if (settings.welcome_embed) {
    const embed = new EmbedBuilder()
      .setTitle(settings.welcome_title || "¡Nuevo Miembro!")
      .setDescription(formattedMessage)
      .setColor(settings.welcome_color || "#5865F2")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: guild.name, iconURL: guild.iconURL() })
      .setTimestamp()

    if (settings.welcome_image) {
      embed.setImage(settings.welcome_image)
    }

    await channel.send({ embeds: [embed] })
  } else {
    await channel.send(formattedMessage)
  }
}

async function handleWelcomeCard(member, settings, channel) {
  const { guild, user } = member

  try {
    // Generar tarjeta de bienvenida
    const welcomeCard = await generateWelcomeCard(
      user,
      guild,
      settings.welcome_message || "¡Bienvenido {user} a {server}!",
      settings.welcome_card_color || "#5865F2",
      settings.welcome_card_background,
      settings.welcome_card_style || "modern",
    )

    // Mensaje adicional si está configurado
    let content = ""
    if (settings.welcome_card_mention) {
      content = `¡Bienvenido ${user}!`
    }

    await channel.send({
      content,
      files: [welcomeCard],
    })
  } catch (error) {
    console.error("Error al generar tarjeta de bienvenida:", error)

    // Fallback a mensaje normal
    await handleWelcomeMessage(member, settings, channel)
  }
}

async function generateWelcomeCard(user, guild, message, color, backgroundUrl, style) {
  // Configuración del canvas según el estilo
  let width, height;
  
  switch (style) {
    case "minimal":
      width = 800;
      height = 250;
      break;
    case "elegant":
      width = 1000;
      height = 300;
      break;
    case "vibrant":
      width = 900;
      height = 400;
      break;
    case "modern":
    default:
      width = 1000;
      height = 360;
      break;
  }
  
  // Crear canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  
  // Cargar fondo
  try {
    let background;
    
    if (backgroundUrl) {
      // Usar fondo personalizado
      background = await loadImage(backgroundUrl);
    } else {
      // Usar fondo predeterminado según el estilo
      switch (style) {
        case "minimal":
          // Fondo sólido para minimalista
          ctx.fillStyle = "#2F3136";
          ctx.fillRect(0, 0, width, height);
          break;
        case "elegant":
          // Fondo degradado para elegante
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          gradient.addColorStop(0, "#2C2F33");
          gradient.addColorStop(1, "#23272A");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          break;
        case "vibrant":
          // Fondo vibrante
          const vibrantGradient = ctx.createLinearGradient(0, 0, width, height);
          vibrantGradient.addColorStop(0, "#8A2387");
          vibrantGradient.addColorStop(0.5, "#E94057");
          vibrantGradient.addColorStop(1, "#F27121");
          ctx.fillStyle = vibrantGradient;
          ctx.fillRect(0, 0, width, height);
          break;
        case "modern":
        default:
          // Fondo moderno
          ctx.fillStyle = "#36393F";
          ctx.fillRect(0, 0, width, height);
          
          // Añadir formas geométricas
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = color;
          
          // Círculos decorativos
          ctx.beginPath();
          ctx.arc(width * 0.8, height * 0.2, 100, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(width * 0.1, height * 0.8, 80, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.globalAlpha = 1;
          break;
      }
    }
    
    if (background) {
      // Dibujar imagen de fondo
      ctx.drawImage(background, 0, 0, width, height);
      
      // Añadir capa de oscurecimiento para mejorar legibilidad
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, width, height);
    }
  } catch (error) {
    console.error("Error al cargar el fondo:", error);
    // Fondo de respaldo
    ctx.fillStyle = "#36393F";
    ctx.fillRect(0, 0, width, height);
  }
  
  // Cargar avatar
  const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 256 }));
  
  // Dibujar elementos según el estilo
  switch (style) {
    case "minimal":
      // Avatar cuadrado con bordes redondeados
      const avatarSize = 100;
      const avatarX = 50;
      const avatarY = height / 2 - avatarSize / 2;
      
      // Dibujar avatar con bordes redondeados
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 10);
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
      
      // Texto de bienvenida
      const formattedMessage = message
        .replace(/{user}/g, user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{count}/g, guild.memberCount);
      
      // Mensaje
      ctx.font = "bold 30px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.fillText(formattedMessage, avatarX + avatarSize + 30, height / 2);
      
      // Línea minimalista
      ctx.beginPath();
      ctx.moveTo(avatarX + avatarSize + 30, height / 2 + 20);
      ctx.lineTo(avatarX + avatarSize + 230, height / 2 + 20);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
      
    case "elegant":
      // Dibujar marco decorativo
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, width - 40, height - 40);
      
      // Dibujar avatar
      const elegantAvatarSize = 180;
      const elegantAvatarX = width / 2 - elegantAvatarSize / 2;
      const elegantAvatarY = 60;
      
      // Avatar circular con borde
      ctx.save();
      ctx.beginPath();
      ctx.arc(elegantAvatarX + elegantAvatarSize / 2, elegantAvatarY + elegantAvatarSize / 2, elegantAvatarSize / 2 + 10, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(elegantAvatarX + elegantAvatarSize / 2, elegantAvatarY + elegantAvatarSize / 2, elegantAvatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, elegantAvatarX, elegantAvatarY, elegantAvatarSize, elegantAvatarSize);
      ctx.restore();
      
      // Texto de bienvenida
      const elegantMessage = message
        .replace(/{user}/g, user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{count}/g, guild.memberCount);
      
      // Título elegante
      ctx.font = "bold 40px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(user.username, width / 2, elegantAvatarY + elegantAvatarSize + 50);
      
      // Mensaje
      ctx.font = "italic 30px Arial";
      ctx.fillStyle = "#E0E0E0";
      ctx.fillText(elegantMessage, width / 2, elegantAvatarY + elegantAvatarSize + 100);
      
      // Nombre del servidor
      ctx.font = "bold 25px Arial";
      ctx.fillStyle = color;
      ctx.fillText(guild.name, width / 2, height - 40);
      break;
      
    case "vibrant":
      // Dibujar formas vibrantes
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 50 + Math.random() * 100;
        
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.restore();
      }
      
      // Dibujar avatar
      const vibrantAvatarSize = 150;
      const vibrantAvatarX = 100;
      const vibrantAvatarY = height / 2 - vibrantAvatarSize / 2;
      
      // Efecto de brillo
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(vibrantAvatarX + vibrantAvatarSize / 2, vibrantAvatarY + vibrantAvatarSize / 2, vibrantAvatarSize / 2 + 5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.restore();
      
      // Avatar circular
      ctx.save();
      ctx.beginPath();
      ctx.arc(vibrantAvatarX + vibrantAvatarSize / 2, vibrantAvatarY + vibrantAvatarSize / 2, vibrantAvatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, vibrantAvatarX, vibrantAvatarY, vibrantAvatarSize, vibrantAvatarSize);
      ctx.restore();
      
      // Texto de bienvenida
      const vibrantMessage = message
        .replace(/{user}/g, user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{count}/g, guild.memberCount);
      
      // Título vibrante
      ctx.font = "bold 40px Arial";
}
