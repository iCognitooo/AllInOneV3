const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { colors } = require("../config.json")
const fs = require("node:fs")
const path = require("node:path")

module.exports = {
  customId: "help-home",
  async execute(interaction) {
    const { client } = interaction

    // Obtener categorías de comandos
    const foldersPath = path.join(__dirname, "../commands")
    const commandFolders = fs.readdirSync(foldersPath)

    // Crear el embed principal
    const mainEmbed = new EmbedBuilder()
      .setTitle("Sistema de Ayuda de Cognixion Bot")
      .setDescription("Selecciona una categoría del menú desplegable para ver los comandos disponibles.")
      .setColor(colors.primary)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: "📚 Categorías Disponibles",
          value: commandFolders.map((folder) => `• ${folder.charAt(0).toUpperCase() + folder.slice(1)}`).join("\n"),
        },
        {
          name: "💡 Consejo",
          value: "Usa `/help [comando]` para obtener información detallada sobre un comando específico.",
        },
      )
      .setFooter({ text: "Cognixion Studio", iconURL: client.user.displayAvatarURL() })
      .setTimestamp()

    // Botones de navegación
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("help-home")
        .setLabel("Inicio")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
        .setEmoji("🏠"),
      new ButtonBuilder()
        .setCustomId("help-support")
        .setLabel("Soporte")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/cognixion")
        .setEmoji("🔧"),
    )

    await interaction.update({
      embeds: [mainEmbed],
      components: [interaction.message.components[0], buttonRow],
    })
  },
}
