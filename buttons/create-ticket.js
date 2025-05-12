const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js")

module.exports = {
  customId: "create-ticket:",
  async execute(interaction) {
    try {
      // Extraer tipo de ticket del customId (create-ticket:tipo)
      const ticketType = interaction.customId.split(":")[1]

      // Crear modal para obtener razón
      const modal = new ModalBuilder().setCustomId(`ticket-reason-modal:${ticketType}`).setTitle("Crear Ticket")

      const reasonInput = new TextInputBuilder()
        .setCustomId("ticket-reason")
        .setLabel("¿En qué podemos ayudarte?")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Describe tu problema o consulta...")
        .setRequired(true)
        .setMaxLength(1000)

      const firstRow = new ActionRowBuilder().addComponents(reasonInput)

      modal.addComponents(firstRow)

      await interaction.showModal(modal)
    } catch (error) {
      console.error("Error al mostrar modal de ticket:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
