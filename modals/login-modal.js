const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "login-modal",
  async execute(interaction) {
    const username = interaction.fields.getTextInputValue("login-username")
    const password = interaction.fields.getTextInputValue("login-password")

    // En un sistema real, aquí verificarías las credenciales contra una base de datos
    // Por ahora, simulamos un inicio de sesión exitoso si el nombre de usuario no está vacío

    if (username && password) {
      const embed = new EmbedBuilder()
        .setTitle("✅ Inicio de Sesión Exitoso")
        .setDescription("Has iniciado sesión correctamente en el sistema de Cognixion Studio.")
        .addFields(
          { name: "Usuario", value: interaction.user.tag, inline: true },
          { name: "ID", value: interaction.user.id, inline: true },
          { name: "Fecha", value: new Date().toLocaleString(), inline: true },
        )
        .setColor(colors.success)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Cognixion Studio", iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else {
      await interaction.reply({
        content: "Por favor, proporciona un nombre de usuario y contraseña válidos.",
        ephemeral: true,
      })
    }
  },
}
