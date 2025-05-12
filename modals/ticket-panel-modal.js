const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "ticket-panel-modal",
  async execute(interaction) {
    try {
      const title = interaction.fields.getTextInputValue("panel-title")
      const description = interaction.fields.getTextInputValue("panel-description")

      // Crear embed del panel
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(colors.primary)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Crear botones
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create-ticket:general")
          .setLabel("Soporte General")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎫"),
        new ButtonBuilder()
          .setCustomId("create-ticket:bug")
          .setLabel("Reportar Bug")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🐛"),
        new ButtonBuilder()
          .setCustomId("create-ticket:sugerencia")
          .setLabel("Sugerencia")
          .setStyle(ButtonStyle.Success)
          .setEmoji("💡"),
      )

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
