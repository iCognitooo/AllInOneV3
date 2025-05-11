// Archivo principal del bot
const { Client, GatewayIntentBits, Collection, ActivityType } = require("discord.js")
const fs = require("node:fs")
const path = require("node:path")
const { token } = require("./config.json")
const { initDatabase } = require("./utils/database")

// Crear una nueva instancia del cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
})

// Colección para almacenar comandos
client.commands = new Collection()
client.buttons = new Collection()
client.selectMenus = new Collection()
client.modals = new Collection()
client.cooldowns = new Collection()

// Inicializar base de datos (pero no detener el bot si falla)
initDatabase().catch(console.error)

// Cargar comandos
const foldersPath = path.join(__dirname, "commands")
const commandFolders = fs.readdirSync(foldersPath)

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder)
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"))

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    try {
      const command = require(filePath)

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command)
      } else {
        console.log(`[ADVERTENCIA] El comando en ${filePath} no tiene las propiedades "data" o "execute" requeridas.`)
      }
    } catch (error) {
      console.error(`[ERROR] Error al cargar el comando en ${filePath}:`, error)
    }
  }
}

// Cargar eventos
const eventsPath = path.join(__dirname, "events")
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"))

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file)
  try {
    const event = require(filePath)

    if (event.once) {
      client.once(event.name, (...args) => {
        try {
          event.execute(...args)
        } catch (error) {
          console.error(`[ERROR] Error al ejecutar el evento ${event.name}:`, error)
        }
      })
    } else {
      client.on(event.name, (...args) => {
        try {
          event.execute(...args)
        } catch (error) {
          console.error(`[ERROR] Error al ejecutar el evento ${event.name}:`, error)
        }
      })
    }
  } catch (error) {
    console.error(`[ERROR] Error al cargar el evento en ${filePath}:`, error)
  }
}

// Cargar botones
const buttonsPath = path.join(__dirname, "buttons")
if (fs.existsSync(buttonsPath)) {
  const buttonFiles = fs.readdirSync(buttonsPath).filter((file) => file.endsWith(".js"))

  for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file)
    try {
      const button = require(filePath)

      if ("customId" in button && "execute" in button) {
        client.buttons.set(button.customId, button)
      } else {
        console.log(`[ADVERTENCIA] El botón en ${filePath} no tiene las propiedades "customId" o "execute" requeridas.`)
      }
    } catch (error) {
      console.error(`[ERROR] Error al cargar el botón en ${filePath}:`, error)
    }
  }
}

// Cargar menús de selección
const selectMenusPath = path.join(__dirname, "selectMenus")
if (fs.existsSync(selectMenusPath)) {
  const selectMenuFiles = fs.readdirSync(selectMenusPath).filter((file) => file.endsWith(".js"))

  for (const file of selectMenuFiles) {
    const filePath = path.join(selectMenusPath, file)
    try {
      const menu = require(filePath)

      if ("customId" in menu && "execute" in menu) {
        client.selectMenus.set(menu.customId, menu)
      } else {
        console.log(`[ADVERTENCIA] El menú en ${filePath} no tiene las propiedades "customId" o "execute" requeridas.`)
      }
    } catch (error) {
      console.error(`[ERROR] Error al cargar el menú en ${filePath}:`, error)
    }
  }
}

// Cargar modales
const modalsPath = path.join(__dirname, "modals")
if (fs.existsSync(modalsPath)) {
  const modalFiles = fs.readdirSync(modalsPath).filter((file) => file.endsWith(".js"))

  for (const file of modalFiles) {
    const filePath = path.join(modalsPath, file)
    try {
      const modal = require(filePath)

      if ("customId" in modal && "execute" in modal) {
        client.modals.set(modal.customId, modal)
      } else {
        console.log(`[ADVERTENCIA] El modal en ${filePath} no tiene las propiedades "customId" o "execute" requeridas.`)
      }
    } catch (error) {
      console.error(`[ERROR] Error al cargar el modal en ${filePath}:`, error)
    }
  }
}

// Manejar errores no capturados
process.on("unhandledRejection", (error) => {
  console.error("Error no manejado:", error)
})

// Iniciar sesión con el token
client.login(token).catch((error) => {
  console.error("Error al iniciar sesión:", error)
})
