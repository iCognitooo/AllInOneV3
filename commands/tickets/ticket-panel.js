const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js")
const { colors } = require("../../config.json")
const { getGuildSettings } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Crea un panel de tickets en el canal actual")
    .addStringOption((option) =>
      option.setName("titulo").setDescription("Título del panel de tickets").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("descripcion").setDescription("Descripción del panel de tickets").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Color del panel (hex)")
        .setRequired(false)
        .addChoices(
          { name: "Azul", value: colors.primary },
          { name: "Verde", value: colors.success },
          { name: "Amarillo", value: colors.warning },
          { name: "Rojo", value: colors.error },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("tipo")
        .setDescription("Tipo de panel de tickets")
        .setRequired(false)
        .addChoices(
          { name: "General", value: "general" },
          { name: "Soporte", value: "soporte" },
          { name: "Reportes", value: "reportes" },
          { name: "Sugerencias", value: "sugerencias" },
          { name: "Personalizado", value: "personalizado" },
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 10,
  async execute(interaction) {
    try {
      // Verificar si el sistema de tickets está configurado
      const settings = await getGuildSettings(interaction.guild.id)
      if (!settings.ticket_category || !settings.ticket_log_channel) {
        return interaction.reply({
          content: "El sistema de tickets no está configurado. Usa `/setup-tickets` para configurarlo primero.",
          ephemeral: true,
        })
      }

      const title = interaction.options.getString("titulo")
      const description = interaction.options.getString("descripcion")
      const color = interaction.options.getString("color") || colors.primary
      const type = interaction.options.getString("tipo") || "general"

      // Crear embed del panel de tickets
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Crear botones según el tipo de panel
      const row = new ActionRowBuilder()

      if (type === "general") {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("create-ticket:general")
            .setLabel("Crear Ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎫"),
        )
      } else if (type === "soporte") {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("create-ticket:soporte")
            .setLabel("Soporte Técnico")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔧"),
          new ButtonBuilder()
            .setCustomId("create-ticket:consulta")
            .setLabel("Consulta General")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("❓"),
        )
      } else if (type === "reportes") {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("create-ticket:bug")
            .setLabel("Reportar Bug")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🐛"),
          new ButtonBuilder()
            .setCustomId("create-ticket:usuario")
            .setLabel("Reportar Usuario")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("👤"),
        )
      } else if (type === "sugerencias") {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("create-ticket:sugerencia")
            .setLabel("Nueva Sugerencia")
            .setStyle(ButtonStyle.Success)
            .setEmoji("💡"),
          new ButtonBuilder()
            .setCustomId("create-ticket:feedback")
            .setLabel("Feedback")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("📝"),
        )
      } else {
        // Personalizado
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("create-ticket:personalizado")
            .setLabel("Crear Ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎫"),
        )
      }

      await interaction.channel.send({ embeds: [embed], components: [row] })
      await interaction.reply({ content: "Panel de tickets creado correctamente.", ephemeral: true })
    } catch (error) {
      console.error("Error al crear panel de tickets:", error)
      await interaction.reply({
        content: "Hubo un error al crear el panel de tickets.",
        ephemeral: true,
      })
    }
  },
}
