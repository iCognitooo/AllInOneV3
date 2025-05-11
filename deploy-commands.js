// Script para registrar los comandos de barra diagonal (slash commands)
const { REST, Routes } = require("discord.js")
const { clientId, guildId, token } = require("./config.json")
const fs = require("node:fs")
const path = require("node:path")

const commands = []
// Obtener todos los archivos de comandos de la carpeta commands
const foldersPath = path.join(__dirname, "commands")
const commandFolders = fs.readdirSync(foldersPath)

for (const folder of commandFolders) {
  // Obtener todos los archivos de comandos de la subcarpeta
  const commandsPath = path.join(foldersPath, folder)
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"))

  // Obtener los datos de cada comando
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command = require(filePath)

    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON())
    } else {
      console.log(`[ADVERTENCIA] El comando en ${filePath} no tiene las propiedades "data" o "execute" requeridas.`)
    }
  }
}

// Instancia REST para registrar comandos
const rest = new REST().setToken(token)

// Registrar comandos
;(async () => {
  try {
    console.log(`Comenzando a actualizar ${commands.length} comandos de aplicación.`)

    // Para registrar comandos globalmente (tarda hasta 1 hora en propagarse):
    // const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });

    // Para registrar comandos en un servidor específico (actualización instantánea):
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })

    console.log(`¡Se actualizaron exitosamente ${data.length} comandos de aplicación!`)
  } catch (error) {
    console.error(error)
  }
})()
