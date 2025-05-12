const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js")
const { colors } = require("../../config.json")
const moment = require("moment")
moment.locale("es")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Muestra información detallada sobre el servidor"),

  async execute(interaction) {
    await interaction.deferReply()

    const { guild } = interaction

    try {
      // Obtener información adicional del servidor
      await guild.fetch()

      // Contar canales por tipo
      const channels = guild.channels.cache
      const textChannels = channels.filter((c) => c.type === ChannelType.GuildText).size
      const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice).size
      const categoryChannels = channels.filter((c) => c.type === ChannelType.GuildCategory).size
      const forumChannels = channels.filter((c) => c.type === ChannelType.GuildForum).size
      const announcementChannels = channels.filter((c) => c.type === ChannelType.GuildAnnouncement).size

      // Contar miembros por estado
      let online = 0
      let idle = 0
      let dnd = 0
      let offline = 0

      guild.members.cache.forEach((member) => {
        switch (member.presence?.status) {
          case "online":
            online++
            break
          case "idle":
            idle++
            break
          case "dnd":
            dnd++
            break
          default:
            offline++
        }
      })

      // Calcular fechas
      const createdAt = moment(guild.createdAt).format("LL")
      const createdAtRelative = moment(guild.createdAt).fromNow()

      // Obtener nivel de verificación
      const verificationLevel =
        {
          0: "Ninguno",
          1: "Bajo (Correo verificado)",
          2: "Medio (Registrado > 5 min)",
          3: "Alto (Miembro > 10 min)",
          4: "Muy Alto (Teléfono verificado)",
        }[guild.verificationLevel] || "Desconocido"

      // Obtener nivel de filtro de contenido
      const contentFilter =
        {
          0: "Desactivado",
          1: "Miembros sin rol",
          2: "Todos los miembros",
        }[guild.explicitContentFilter] || "Desconocido"

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle(`Información del servidor: ${guild.name}`)
        .setColor(colors.primary)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: "📋 ID", value: guild.id, inline: true },
          { name: "👑 Propietario", value: `<@${guild.ownerId}>`, inline: true },
          { name: "🌍 Región", value: guild.preferredLocale || "Desconocida", inline: true },
          { name: "📅 Creado el", value: `${createdAt}\n(${createdAtRelative})`, inline: false },
          {
            name: "👥 Miembros",
            value: `Total: **${guild.memberCount}**\n🟢 En línea: **${online}**\n🟡 Ausente: **${idle}**\n🔴 No molestar: **${dnd}**\n⚫ Desconectados: **${offline}**`,
            inline: true,
          },
          {
            name: "📊 Estadísticas",
            value: `Roles: **${guild.roles.cache.size}**\nEmojis: **${guild.emojis.cache.size}**\nStickers: **${guild.stickers.cache.size}**\nBoosts: **${guild.premiumSubscriptionCount || 0}**`,
            inline: true,
          },
          {
            name: "🔒 Seguridad",
            value: `Verificación: **${verificationLevel}**\nFiltro: **${contentFilter}**`,
            inline: false,
          },
          {
            name: "💬 Canales",
            value: `Total: **${channels.size}**\n📝 Texto: **${textChannels}**\n🔊 Voz: **${voiceChannels}**\n📂 Categorías: **${categoryChannels}**\n📣 Anuncios: **${announcementChannels}**\n📊 Foros: **${forumChannels}**`,
            inline: false,
          },
        )
        .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp()

      // Añadir banner si existe
      if (guild.banner) {
        embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }))
      }

      // Añadir nivel de impulso
      if (guild.premiumTier > 0) {
        const tierNames = {
          1: "Nivel 1",
          2: "Nivel 2",
          3: "Nivel 3",
        }

        embed.addFields({
          name: "🚀 Nivel de impulso",
          value: `${tierNames[guild.premiumTier]} (${guild.premiumSubscriptionCount} impulsos)`,
          inline: true,
        })
      }

      // Añadir características si existen
      if (guild.features.length > 0) {
        const featureMap = {
          ANIMATED_BANNER: "Banner animado",
          ANIMATED_ICON: "Icono animado",
          BANNER: "Banner",
          COMMERCE: "Comercio",
          COMMUNITY: "Comunidad",
          DISCOVERABLE: "Descubrible",
          FEATURABLE: "Destacable",
          INVITE_SPLASH: "Fondo de invitación",
          MEMBER_VERIFICATION_GATE_ENABLED: "Verificación de miembros",
          NEWS: "Canales de noticias",
          PARTNERED: "Servidor asociado",
          PREVIEW_ENABLED: "Vista previa",
          VANITY_URL: "URL personalizada",
          VERIFIED: "Servidor verificado",
          VIP_REGIONS: "Regiones VIP",
          WELCOME_SCREEN_ENABLED: "Pantalla de bienvenida",
          TICKETED_EVENTS_ENABLED: "Eventos con tickets",
          MONETIZATION_ENABLED: "Monetización",
          MORE_STICKERS: "Más stickers",
          THREE_DAY_THREAD_ARCHIVE: "Archivado de hilos de 3 días",
          SEVEN_DAY_THREAD_ARCHIVE: "Archivado de hilos de 7 días",
          PRIVATE_THREADS: "Hilos privados",
          ROLE_ICONS: "Iconos de rol",
        }

        const features = guild.features
          .map((feature) => featureMap[feature] || feature)
          .sort()
          .slice(0, 10)

        embed.addFields({
          name: "✨ Características",
          value: features.join(", ") + (guild.features.length > 10 ? "..." : ""),
          inline: false,
        })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error("Error en comando serverinfo:", error)
      await interaction.editReply({
        content: "Hubo un error al obtener la información del servidor. Inténtalo de nuevo más tarde.",
        ephemeral: true,
      })
    }
  },
}
