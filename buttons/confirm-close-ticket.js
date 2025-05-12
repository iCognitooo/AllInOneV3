const { closeTicket } = require("../utils/ticket-manager")
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js")

module.exports = {
  customId: "confirm-close-ticket",
  async execute(interaction) {
    try {
      // Mostrar modal para razón de cierre
      const modal = new ModalBuilder().setCustomId("close-ticket-reason-modal").setTitle("Cerrar Ticket")

      const reasonInput = new TextInputBuilder()
        .setCustomId("close-reason")
        .setLabel("Razón de cierre")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("¿Por qué estás cerrando este ticket?")
        .setRequired(false)
        .setMaxLength(1000)

      const firstRow = new ActionRowBuilder().addComponents(reasonInput)

      modal.addComponents(firstRow)

      await interaction.showModal(modal)
    } catch (error) {
      console.error("Error al mostrar modal de cierre:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
