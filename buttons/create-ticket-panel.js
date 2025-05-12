const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "create-ticket-panel",
  async execute(interaction) {
    try {
      // Crear modal para configurar el panel
      const modal = new ModalBuilder().setCustomId("ticket-panel-modal").setTitle("Crear Panel de Tickets")

      const titleInput = new TextInputBuilder()
        .setCustomId("panel-title")
        .setLabel("Título del Panel")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ej: Sistema de Soporte")
        .setRequired(true)

      const descriptionInput = new TextInputBuilder()
        .setCustomId("panel-description")
        .setLabel("Descripción")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Ej: Haz clic en el botón para crear un ticket de soporte.")
        .setRequired(true)

      const firstRow = new ActionRowBuilder().addComponents(titleInput)
      const secondRow = new ActionRowBuilder().addComponents(descriptionInput)

      modal.addComponents(firstRow, secondRow)

      await interaction.showModal(modal)
    } catch (error) {
      console.error("Error al mostrar modal de panel de tickets:", error)
      await interaction.reply({
        content: "Hubo un error al crear el panel de tickets.",
        ephemeral: true,
      })
    }
  },
}
