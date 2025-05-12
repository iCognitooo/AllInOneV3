const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { getData, saveData, updateData } = require("../../utils/data-manager")
const logger = require("../../utils/logger")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("economia")
    .setDescription("Sistema de economía avanzado")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("depositar")
        .setDescription("Deposita dinero en tu cuenta bancaria")
        .addIntegerOption((option) =>
          option
            .setName("cantidad")
            .setDescription('Cantidad a depositar (usa "todo" para depositar todo)')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("retirar")
        .setDescription("Retira dinero de tu cuenta bancaria")
        .addIntegerOption((option) =>
          option
            .setName("cantidad")
            .setDescription('Cantidad a retirar (usa "todo" para retirar todo)')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("transferir")
        .setDescription("Transfiere dinero a otro usuario")
        .addUserOption((option) =>
          option.setName("usuario").setDescription("Usuario al que quieres transferir dinero").setRequired(true),
        )
        .addIntegerOption((option) =>
          option.setName("cantidad").setDescription("Cantidad a transferir").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("panel").setDescription("Muestra tu panel económico completo")),

  async execute(interaction, client) {
    try {
      await interaction.deferReply()

      // Obtener el subcomando ejecutado
      const subcommand = interaction.options.getSubcommand()

      // Consulta SQL para obtener los datos económicos del usuario
      const sqlQuery = `
        SELECT * FROM economy 
        WHERE user_id = ? AND guild_id = ?
      `

      // Obtener datos económicos del usuario
      const economyData = await getData(
        "economy",
        { userId: interaction.user.id, guildId: interaction.guild.id },
        sqlQuery,
        [interaction.user.id, interaction.guild.id],
      )

      // Si no hay datos económicos, crear un registro predeterminado
      let userEconomy
      if (!economyData || economyData.length === 0) {
        userEconomy = {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          balance: 0,
          bank: 0,
          lastDaily: null,
          lastWork: null,
          inventory: [],
        }
      } else {
        userEconomy = economyData[0]
      }

      // Ejecutar el subcomando correspondiente
      switch (subcommand) {
        case "depositar":
          await handleDeposit(interaction, userEconomy)
          break
        case "retirar":
          await handleWithdraw(interaction, userEconomy)
          break
        case "transferir":
          await handleTransfer(interaction, userEconomy)
          break
        case "panel":
          await handlePanel(interaction, userEconomy)
          break
      }
    } catch (error) {
      logger.error(`Error en el comando economia: ${error.message}`)

      // Si ya se ha diferido la respuesta, editar la respuesta
      if (interaction.deferred) {
        await interaction
          .editReply({
            content: "Ha ocurrido un error en el sistema económico. Por favor, inténtalo de nuevo más tarde.",
          })
          .catch(console.error)
      } else {
        // Si no se ha diferido, responder normalmente
        await interaction
          .reply({
            content: "Ha ocurrido un error en el sistema económico. Por favor, inténtalo de nuevo más tarde.",
            ephemeral: true,
          })
          .catch(console.error)
      }
    }
  },
}

async function handleDeposit(interaction, userEconomy) {
  const amount = interaction.options.getInteger("cantidad")

  if (amount <= 0) {
    return interaction.editReply({ content: "La cantidad a depositar debe ser mayor que cero." })
  }

  if (userEconomy.balance < amount) {
    return interaction.editReply({ content: "No tienes suficiente dinero para depositar." })
  }

  userEconomy.balance -= amount
  userEconomy.bank += amount

  const updateQuery = `
    UPDATE economy
    SET balance = ?, bank = ?
    WHERE user_id = ? AND guild_id = ?
  `

  await updateData(
    "economy",
    { balance: userEconomy.balance, bank: userEconomy.bank },
    { userId: interaction.user.id, guildId: interaction.guild.id },
    updateQuery,
    [userEconomy.balance, userEconomy.bank, interaction.user.id, interaction.guild.id],
  )

  const embed = new EmbedBuilder()
    .setTitle("🏦 Depósito Exitoso")
    .setDescription(`Has depositado **${amount}** en tu cuenta bancaria.`)
    .addFields(
      { name: "Balance", value: `${userEconomy.balance}`, inline: true },
      { name: "Banco", value: `${userEconomy.bank}`, inline: true },
    )
    .setColor("Green")

  await interaction.editReply({ embeds: [embed] })
}

async function handleWithdraw(interaction, userEconomy) {
  const amount = interaction.options.getInteger("cantidad")

  if (amount <= 0) {
    return interaction.editReply({ content: "La cantidad a retirar debe ser mayor que cero." })
  }

  if (userEconomy.bank < amount) {
    return interaction.editReply({ content: "No tienes suficiente dinero en el banco para retirar." })
  }

  userEconomy.balance += amount
  userEconomy.bank -= amount

  const updateQuery = `
    UPDATE economy
    SET balance = ?, bank = ?
    WHERE user_id = ? AND guild_id = ?
  `

  await updateData(
    "economy",
    { balance: userEconomy.balance, bank: userEconomy.bank },
    { userId: interaction.user.id, guildId: interaction.guild.id },
    updateQuery,
    [userEconomy.balance, userEconomy.bank, interaction.user.id, interaction.guild.id],
  )

  const embed = new EmbedBuilder()
    .setTitle("💸 Retiro Exitoso")
    .setDescription(`Has retirado **${amount}** de tu cuenta bancaria.`)
    .addFields(
      { name: "Balance", value: `${userEconomy.balance}`, inline: true },
      { name: "Banco", value: `${userEconomy.bank}`, inline: true },
    )
    .setColor("Green")

  await interaction.editReply({ embeds: [embed] })
}

async function handleTransfer(interaction, userEconomy) {
  const targetUser = interaction.options.getUser("usuario")
  const amount = interaction.options.getInteger("cantidad")

  if (targetUser.id === interaction.user.id) {
    return interaction.editReply({ content: "No puedes transferirte dinero a ti mismo." })
  }

  if (amount <= 0) {
    return interaction.editReply({ content: "La cantidad a transferir debe ser mayor que cero." })
  }

  if (userEconomy.balance < amount) {
    return interaction.editReply({ content: "No tienes suficiente dinero para transferir." })
  }

  // Obtener los datos económicos del usuario receptor
  const sqlQuery = `
    SELECT * FROM economy 
    WHERE user_id = ? AND guild_id = ?
  `

  const targetEconomyData = await getData(
    "economy",
    { userId: targetUser.id, guildId: interaction.guild.id },
    sqlQuery,
    [targetUser.id, interaction.guild.id],
  )

  let targetEconomy
  if (!targetEconomyData || targetEconomyData.length === 0) {
    targetEconomy = {
      userId: targetUser.id,
      guildId: interaction.guild.id,
      balance: 0,
      bank: 0,
      lastDaily: null,
      lastWork: null,
      inventory: [],
    }

    // Guardar el nuevo perfil del usuario receptor
    await saveData("economy", targetEconomy)
  } else {
    targetEconomy = targetEconomyData[0]
  }

  // Realizar la transferencia
  userEconomy.balance -= amount
  targetEconomy.balance += amount

  // Actualizar los datos en la base de datos
  const updateQuery = `
    UPDATE economy
    SET balance = ?
    WHERE user_id = ? AND guild_id = ?
  `

  await updateData(
    "economy",
    { balance: userEconomy.balance },
    { userId: interaction.user.id, guildId: interaction.guild.id },
    updateQuery,
    [userEconomy.balance, interaction.user.id, interaction.guild.id],
  )

  await updateData(
    "economy",
    { balance: targetEconomy.balance },
    { userId: targetUser.id, guildId: interaction.guild.id },
    updateQuery,
    [targetEconomy.balance, targetUser.id, interaction.guild.id],
  )

  const embed = new EmbedBuilder()
    .setTitle("💸 Transferencia Exitosa")
    .setDescription(`Has transferido **${amount}** a ${targetUser.username}.`)
    .addFields(
      { name: "Tu Balance", value: `${userEconomy.balance}`, inline: true },
      { name: "Balance de " + targetUser.username, value: `${targetEconomy.balance}`, inline: true },
    )
    .setColor("Green")

  await interaction.editReply({ embeds: [embed] })
}

async function handlePanel(interaction, userEconomy) {
  const embed = new EmbedBuilder()
    .setTitle("💰 Panel Económico")
    .setDescription(`Aquí está tu información económica.`)
    .addFields(
      { name: "Balance", value: `${userEconomy.balance}`, inline: true },
      { name: "Banco", value: `${userEconomy.bank}`, inline: true },
    )
    .setColor("Blue")

  await interaction.editReply({ embeds: [embed] })
}
