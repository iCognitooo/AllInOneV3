const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require("discord.js")
const { colors } = require("../../config.json")
const { getGuildConfig, updateGuildConfig } = require("../../utils/data-manager")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configura las opciones del bot para este servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      // Obtener la configuración actual del servidor
      const guildConfig = await getGuildConfig(interaction.guild.id)

      // Crear embed con la configuración actual
      const embed = new EmbedBuilder()
        .setTitle("⚙️ Panel de Configuración")
        .setDescription("Selecciona una categoría para configurar los ajustes del bot en este servidor.")
        .setColor(colors.primary)
        .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "🔧 Configuración General", value: "Prefijo, canal de logs, etc.", inline: true },
          {
            name: "👋 Bienvenidas",
            value: guildConfig.welcome.enabled ? "✅ Activado" : "❌ Desactivado",
            inline: true,
          },
          { name: "🎫 Tickets", value: guildConfig.tickets.enabled ? "✅ Activado" : "❌ Desactivado", inline: true },
          { name: "🛡️ Moderación", value: "Auto-mod, filtros, etc.", inline: true },
          { name: "📊 Niveles", value: guildConfig.levels.enabled ? "✅ Activado" : "❌ Desactivado", inline: true },
          { name: "🎵 Música", value: "Configuración del sistema de música", inline: true },
        )
        .setFooter({ text: "Usa el menú desplegable para navegar entre las categorías" })
        .setTimestamp()

      // Crear menú de selección
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("config-menu")
          .setPlaceholder("Selecciona una categoría")
          .addOptions([
            {
              label: "General",
              description: "Configuración general del bot",
              value: "general",
              emoji: "🔧",
            },
            {
              label: "Bienvenidas",
              description: "Configurar sistema de bienvenidas",
              value: "welcome",
              emoji: "👋",
            },
            {
              label: "Tickets",
              description: "Configurar sistema de tickets",
              value: "tickets",
              emoji: "🎫",
            },
            {
              label: "Moderación",
              description: "Configurar herramientas de moderación",
              value: "moderation",
              emoji: "🛡️",
            },
            {
              label: "Niveles",
              description: "Configurar sistema de niveles",
              value: "levels",
              emoji: "📊",
            },
            {
              label: "Música",
              description: "Configurar sistema de música",
              value: "music",
              emoji: "🎵",
            },
          ]),
      )

      await interaction.editReply({ embeds: [embed], components: [row] })
    } catch (error) {
      console.error("Error en comando config:", error)
      await interaction.editReply({
        content: "Hubo un error al cargar la configuración. Inténtalo de nuevo más tarde.",
        ephemeral: true,
      })
    }
  },
}
