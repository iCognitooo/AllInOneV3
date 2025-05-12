const { createTicket } = require("../utils/ticket-manager")

module.exports = {
  customId: "ticket-reason-modal:",
  async execute(interaction) {
    try {
      // Extraer tipo de ticket del customId (ticket-reason-modal:tipo)
      const ticketType = interaction.customId.split(":")[1]
      const reason = interaction.fields.getTextInputValue("ticket-reason")

      // Crear ticket
      await createTicket(interaction, ticketType, reason)
    } catch (error) {
      console.error("Error al crear ticket:", error)
      await interaction.reply({
        content: "Hubo un error al crear el ticket.",
        ephemeral: true,
      })
    }
  },
}
