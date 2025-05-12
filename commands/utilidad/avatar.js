const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Muestra el avatar de un usuario")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuario del que quieres ver el avatar").setRequired(false),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("usuario") || interaction.user
    const member = interaction.guild.members.cache.get(user.id)

    // Obtener URLs de avatares
    const userAvatar = user.displayAvatarURL({ size: 4096, dynamic: true })
    const serverAvatar = member?.displayAvatarURL({ size: 4096, dynamic: true })

    // Determinar si el usuario tiene un avatar de servidor diferente
    const hasDifferentServerAvatar = member && serverAvatar !== userAvatar

    // Crear embed para el avatar global
    const globalEmbed = new EmbedBuilder()
      .setTitle(`Avatar de ${user.tag}`)
      .setDescription(`Avatar global de ${user}`)
      .setColor(member?.displayHexColor || colors.primary)
      .setImage(userAvatar)
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp()

    // Crear botones para diferentes formatos
    const globalButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("PNG")
        .setStyle(ButtonStyle.Link)
        .setURL(user.displayAvatarURL({ size: 4096, extension: "png" })),
      new ButtonBuilder()
        .setLabel("JPG")
        .setStyle(ButtonStyle.Link)
        .setURL(user.displayAvatarURL({ size: 4096, extension: "jpg" })),
      new ButtonBuilder()
        .setLabel("WEBP")
        .setStyle(ButtonStyle.Link)
        .setURL(user.displayAvatarURL({ size: 4096, extension: "webp" })),
    )

    // Si el usuario tiene un GIF, añadir botón para GIF
    if (user.avatar && user.avatar.startsWith("a_")) {
      globalButtons.addComponents(
        new ButtonBuilder()
          .setLabel("GIF")
          .setStyle(ButtonStyle.Link)
          .setURL(user.displayAvatarURL({ size: 4096, extension: "gif" })),
      )
    }

    // Si el usuario tiene un avatar de servidor diferente, crear un segundo embed y botones
    if (hasDifferentServerAvatar) {
      const serverEmbed = new EmbedBuilder()
        .setTitle(`Avatar de servidor de ${user.tag}`)
        .setDescription(`Avatar específico para este servidor de ${user}`)
        .setColor(member.displayHexColor || colors.primary)
        .setImage(serverAvatar)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp()

      const serverButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("PNG")
          .setStyle(ButtonStyle.Link)
          .setURL(member.displayAvatarURL({ size: 4096, extension: "png" })),
        new ButtonBuilder()
          .setLabel("JPG")
          .setStyle(ButtonStyle.Link)
          .setURL(member.displayAvatarURL({ size: 4096, extension: "jpg" })),
        new ButtonBuilder()
          .setLabel("WEBP")
          .setStyle(ButtonStyle.Link)
          .setURL(member.displayAvatarURL({ size: 4096, extension: "webp" })),
      )

      // Si el avatar de servidor es un GIF, añadir botón para GIF
      if (member.avatar && member.avatar.startsWith("a_")) {
        serverButtons.addComponents(
          new ButtonBuilder()
            .setLabel("GIF")
            .setStyle(ButtonStyle.Link)
            .setURL(member.displayAvatarURL({ size: 4096, extension: "gif" })),
        )
      }

      // Enviar ambos embeds
      await interaction.reply({
        embeds: [globalEmbed, serverEmbed],
        components: [globalButtons, serverButtons],
      })
    } else {
      // Enviar solo el embed global
      await interaction.reply({
        embeds: [globalEmbed],
        components: [globalButtons],
      })
    }
  },
}
