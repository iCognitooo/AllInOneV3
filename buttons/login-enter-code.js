const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js")

module.exports = {
  customId: "login-enter-code",
  async execute(interaction) {
    // Crear modal para introducir código
    const modal = new ModalBuilder().setCustomId("login-code-modal").setTitle("Introducir Código de Acceso")

    const codeInput = new TextInputBuilder()
      .setCustomId("login-code-input")
      .setLabel("Código de Acceso")
      .setStyle(TextInputStyle.Short)
      .setMinLength(6)
      .setMaxLength(6)
      .setPlaceholder("Introduce el código de 6 caracteres")
      .setRequired(true)

    const firstRow = new ActionRowBuilder().addComponents(codeInput)

    modal.addComponents(firstRow)

    await interaction.showModal(modal)
  },
}
