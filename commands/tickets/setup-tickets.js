const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../../config.json")
const { updateGuildSettings } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-tickets")
    .setDescription("Configura el sistema de tickets para tu servidor")
    .addChannelOption((option) =>
      option
        .setName("logs")
        .setDescription("Canal donde se enviarán los logs de tickets")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("categoria")
        .setDescription("Categoría donde se crearán los tickets")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option.setName("staff").setDescription("Rol de staff que tendrá acceso a los tickets").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  async execute(interaction) {
    try {
      const logChannel = interaction.options.getChannel("logs")
      const ticketCategory = interaction.options.getChannel("categoria")
      const staffRole = interaction.options.getRole("staff")

      // Guardar configuración en la base de datos
      await updateGuildSettings(interaction.guild.id, {
        ticket_log_channel: logChannel.id,
        ticket_category: ticketCategory.id,
        ticket_staff_role: staffRole.id,
      })

      const embed = new EmbedBuilder()
        .setTitle("✅ Sistema de Tickets Configurado")
        .setDescription("El sistema de tickets ha sido configurado correctamente.")
        .addFields(
          { name: "Canal de Logs", value: `<#${logChannel.id}>`, inline: true },
          { name: "Categoría de Tickets", value: ticketCategory.name, inline: true },
          { name: "Rol de Staff", value: `<@&${staffRole.id}>`, inline: true },
        )
        .setColor(colors.success)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Botón para crear panel de tickets
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create-ticket-panel")
          .setLabel("Crear Panel de Tickets")
          .setStyle(ButtonStyle.Primary),
      )

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
    } catch (error) {
      console.error("Error al configurar tickets:", error)
      await interaction.reply({
        content: "Hubo un error al configurar el sistema de tickets.",
        ephemeral: true,
      })
    }
  },
}
