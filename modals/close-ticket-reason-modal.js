const { closeTicket } = require("../utils/ticket-manager")

module.exports = {
  customId: "close-ticket-reason-modal",
  async execute(interaction) {
    try {
      const reason = interaction.fields.getTextInputValue("close-reason")
      await closeTicket(interaction, reason)
    } catch (error) {
      console.error("Error al cerrar ticket:", error)
      await interaction.reply({
        content: "Hubo un error al cerrar el ticket.",
        ephemeral: true,
      })
    }
  },
}
