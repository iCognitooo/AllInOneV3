module.exports = {
  customId: "cancel-close-ticket",
  async execute(interaction) {
    await interaction.update({
      content: "Operación cancelada. El ticket permanecerá abierto.",
      embeds: [],
      components: [],
    })
  },
}
