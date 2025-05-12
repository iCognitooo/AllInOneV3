const { Collection, Events } = require("discord.js")

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      // Manejar comandos de barra diagonal
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName)

        if (!command) {
          console.error(`No se encontró ningún comando que coincida con ${interaction.commandName}.`)
          return
        }

        // Sistema de cooldown
        const { cooldowns } = interaction.client

        if (!cooldowns.has(command.data.name)) {
          cooldowns.set(command.data.name, new Collection())
        }

        const now = Date.now()
        const timestamps = cooldowns.get(command.data.name)
        const defaultCooldownDuration = 3
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000

        if (timestamps.has(interaction.user.id)) {
          const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount

          if (now < expirationTime) {
            const expiredTimestamp = Math.round(expirationTime / 1000)
            return interaction.reply({
              content: `Por favor espera, estás en cooldown para \`${command.data.name}\`. Puedes usarlo de nuevo <t:${expiredTimestamp}:R>.`,
              ephemeral: true,
            })
          }
        }

        timestamps.set(interaction.user.id, now)
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount)

        try {
          await command.execute(interaction)
        } catch (error) {
          console.error(`Error al ejecutar el comando ${command.data.name}:`, error)

          const errorMessage = "Hubo un error al ejecutar este comando. El administrador ha sido notificado."

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(console.error)
          } else {
            await interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error)
          }
        }
      }
      // Manejar botones
      else if (interaction.isButton()) {
        // Extraer el ID base del botón (para botones con IDs dinámicos como "button:123")
        const baseCustomId = interaction.customId.split(":")[0]

        // Primero intentar encontrar un manejador exacto
        let button = interaction.client.buttons.get(interaction.customId)

        // Si no se encuentra, buscar un manejador por ID base
        if (!button) {
          button = interaction.client.buttons.get(baseCustomId)
        }

        if (!button) {
          console.warn(`No se encontró manejador para el botón: ${interaction.customId}`)
          return
        }

        try {
          await button.execute(interaction)
        } catch (error) {
          console.error(`Error al ejecutar el botón ${interaction.customId}:`, error)
          await interaction
            .reply({
              content: "Hubo un error al procesar esta interacción.",
              ephemeral: true,
            })
            .catch(console.error)
        }
      }
      // Manejar menús de selección
      else if (interaction.isStringSelectMenu()) {
        // Extraer el ID base del menú (para menús con IDs dinámicos)
        const baseCustomId = interaction.customId.split(":")[0]

        // Primero intentar encontrar un manejador exacto
        let menu = interaction.client.selectMenus.get(interaction.customId)

        // Si no se encuentra, buscar un manejador por ID base
        if (!menu) {
          menu = interaction.client.selectMenus.get(baseCustomId)
        }

        if (!menu) {
          console.warn(`No se encontró manejador para el menú: ${interaction.customId}`)
          return
        }

        try {
          await menu.execute(interaction)
        } catch (error) {
          console.error(`Error al ejecutar el menú ${interaction.customId}:`, error)
          await interaction
            .reply({
              content: "Hubo un error al procesar esta selección.",
              ephemeral: true,
            })
            .catch(console.error)
        }
      }
      // Manejar modales
      else if (interaction.isModalSubmit()) {
        // Extraer el ID base del modal (para modales con IDs dinámicos)
        const baseCustomId = interaction.customId.split(":")[0]

        // Primero intentar encontrar un manejador exacto
        let modal = interaction.client.modals.get(interaction.customId)

        // Si no se encuentra, buscar un manejador por ID base
        if (!modal) {
          modal = interaction.client.modals.get(baseCustomId)
        }

        if (!modal) {
          console.warn(`No se encontró manejador para el modal: ${interaction.customId}`)
          return
        }

        try {
          await modal.execute(interaction)
        } catch (error) {
          console.error(`Error al ejecutar el modal ${interaction.customId}:`, error)
          await interaction
            .reply({
              content: "Hubo un error al procesar este formulario.",
              ephemeral: true,
            })
            .catch(console.error)
        }
      }
      // Manejar autocompletado
      else if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName)

        if (!command || !command.autocomplete) {
          console.warn(`No se encontró autocompletado para: ${interaction.commandName}`)
          return
        }

        try {
          await command.autocomplete(interaction)
        } catch (error) {
          console.error(`Error en autocompletado para ${interaction.commandName}:`, error)
        }
      }
    } catch (error) {
      console.error("Error general en interactionCreate:", error)
    }
  },
}
