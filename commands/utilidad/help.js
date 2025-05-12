const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const fs = require("node:fs")
const path = require("node:path")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Muestra información de ayuda sobre los comandos disponibles")
    .addStringOption((option) =>
      option.setName("comando").setDescription("Comando específico del que quieres información").setRequired(false),
    ),

  async execute(interaction) {
    const commandName = interaction.options.getString("comando")
    const { commands } = interaction.client

    if (commandName) {
      const command = commands.get(commandName)

      if (!command) {
        return interaction.reply({
          content: `No se encontró ningún comando llamado \`${commandName}\``,
          ephemeral: true,
        })
      }

      const embed = new EmbedBuilder()
        .setTitle(`Comando: /${command.data.name}`)
        .setDescription(command.data.description)
        .setColor(colors.primary)
        .setTimestamp()

      if (command.data.options && command.data.options.length > 0) {
        let optionsText = ""

        command.data.options.forEach((option) => {
          const required = option.required ? "(Requerido)" : "(Opcional)"
          optionsText += `**${option.name}**: ${option.description} ${required}\n`
        })

        embed.addFields({ name: "Opciones", value: optionsText })
      }

      if (command.cooldown) {
        embed.addFields({ name: "Cooldown", value: `${command.cooldown} segundos` })
      }

      return interaction.reply({ embeds: [embed] })
    }

    const foldersPath = path.join(__dirname, "../../commands")
    const commandFolders = fs.readdirSync(foldersPath)

    const mainEmbed = new EmbedBuilder()
      .setTitle("Sistema de Ayuda de Cognixion Bot")
      .setDescription("Selecciona una categoría del menú desplegable para ver los comandos disponibles.")
      .setColor(colors.primary)
      .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
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
      .setFooter({ text: "Cognixion Studio", iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help-category")
        .setPlaceholder("Selecciona una categoría")
        .addOptions(
          commandFolders.map((folder) => ({
            label: folder.charAt(0).toUpperCase() + folder.slice(1),
            description: `Comandos de ${folder}`,
            value: folder,
            emoji: getCategoryEmoji(folder),
          })),
        ),
    )

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("help-home")
        .setLabel("Inicio")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
        .setEmoji("🏠"),
      new ButtonBuilder()
        .setLabel("Soporte")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/cognixion")
        .setEmoji("🔧"),
    )

    await interaction.reply({ embeds: [mainEmbed], components: [row, buttonRow] })
  },
}

function getCategoryEmoji(category) {
  const emojis = {
    admin: "⚙️",
    configuracion: "🔧",
    diversion: "🎮",
    economia: "💰",
    moderacion: "🛡️",
    musica: "🎵",
    niveles: "📊",
    sistema: "💻",
    tickets: "🎫",
    utilidad: "🔨",
  }

  return emojis[category] || "📁"
}
