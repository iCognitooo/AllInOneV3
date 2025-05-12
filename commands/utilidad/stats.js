const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js")
const { colors } = require("../../config.json")
const { ChartJSNodeCanvas } = require("chartjs-node-canvas")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Muestra estadísticas del servidor")
    .addSubcommand((subcommand) => subcommand.setName("server").setDescription("Estadísticas generales del servidor"))
    .addSubcommand((subcommand) => subcommand.setName("members").setDescription("Estadísticas de miembros"))
    .addSubcommand((subcommand) => subcommand.setName("channels").setDescription("Estadísticas de canales"))
    .addSubcommand((subcommand) => subcommand.setName("roles").setDescription("Estadísticas de roles"))
    .addSubcommand((subcommand) => subcommand.setName("activity").setDescription("Estadísticas de actividad")),
  cooldown: 10,
  async execute(interaction) {
    try {
      await interaction.deferReply()

      const subcommand = interaction.options.getSubcommand()
      const { guild } = interaction

      if (subcommand === "server") {
        // Obtener estadísticas del servidor
        const owner = await guild.fetchOwner()
        const createdAt = Math.floor(guild.createdTimestamp / 1000)
        const boostLevel = guild.premiumTier
        const boostCount = guild.premiumSubscriptionCount
        const memberCount = guild.memberCount
        const channelCount = guild.channels.cache.size
        const roleCount = guild.roles.cache.size
        const emojiCount = guild.emojis.cache.size
        const stickerCount = guild.stickers.cache.size

        // Crear embed
        const embed = new EmbedBuilder()
          .setTitle(`📊 Estadísticas de ${guild.name}`)
          .setDescription("Información general del servidor.")
          .addFields(
            { name: "👑 Propietario", value: `${owner.user.tag} (${owner.user.id})`, inline: true },
            { name: "📆 Creado", value: `<t:${createdAt}:R>`, inline: true },
            { name: "🆔 ID", value: guild.id, inline: true },
            { name: "👥 Miembros", value: memberCount.toString() },
          )
          .setColor(colors.primary)

        await interaction.editReply({ embeds: [embed] })
      }
    } catch (error) {
      console.error(error)
      await interaction.editReply("Ocurrió un error al ejecutar el comando.")
    }
  },
}
