const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configura el bot para tu servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Configuración de Cognixion Bot")
      .setDescription("Bienvenido al asistente de configuración. Selecciona una opción para comenzar.")
      .setColor(colors.primary)
      .addFields(
        { name: "Canales de Bienvenida", value: "Configura mensajes de bienvenida personalizados" },
        { name: "Roles Automáticos", value: "Asigna roles automáticamente a nuevos miembros" },
        { name: "Logs", value: "Configura canales para registrar eventos del servidor" },
        { name: "Sistema de Tickets", value: "Configura un sistema de tickets de soporte" },
      )
      .setFooter({ text: "Cognixion Studio", iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("setup-welcome").setLabel("Bienvenida").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("setup-autorole").setLabel("Roles Auto").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("setup-logs").setLabel("Logs").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("setup-tickets").setLabel("Tickets").setStyle(ButtonStyle.Primary),
    )

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
  },
}
