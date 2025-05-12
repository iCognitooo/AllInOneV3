const fs = require("fs")
const path = require("path")
const logger = require("./logger")

// Directorio para almacenar los datos
const DATA_DIR = path.join(__dirname, "..", "data")

// Asegurarse de que el directorio de datos exista
function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      logger.info(`Directorio de datos creado en: ${DATA_DIR}`)
    }
  } catch (error) {
    logger.error(`Error al crear el directorio de datos: ${error.message}`)
  }
}

// Inicializar el sistema de archivos de base de datos
function initializeFileDatabase() {
  ensureDataDirectory()

  // Crear archivos de base de datos iniciales si no existen
  const initialCollections = [
    "users",
    "guilds",
    "economy",
    "levels",
    "tickets",
    "warnings",
    "reminders",
    "tags",
    "templates",
    "polls",
    "reaction_roles",
    "automod",
    "logs",
    "welcome",
    "verification",
    "music",
    "games",
    "backups",
  ]

  for (const collection of initialCollections) {
    const filePath = path.join(DATA_DIR, `${collection}.json`)
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2))
        logger.info(`Archivo de colección creado: ${collection}.json`)
      } catch (error) {
        logger.error(`Error al crear el archivo de colección ${collection}.json: ${error.message}`)
      }
    }
  }

  logger.info("Sistema de archivos de base de datos inicializado correctamente.")
  return true
}

// Leer datos de una colección
function readCollection(collection) {
  try {
    const filePath = path.join(DATA_DIR, `${collection}.json`)

    if (!fs.existsSync(filePath)) {
      logger.warn(`La colección ${collection} no existe. Creando archivo vacío.`)
      fs.writeFileSync(filePath, JSON.stringify([], null, 2))
      return []
    }

    const data = fs.readFileSync(filePath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    logger.error(`Error al leer la colección ${collection}: ${error.message}`)
    return []
  }
}

// Escribir datos en una colección
function writeCollection(collection, data) {
  try {
    const filePath = path.join(DATA_DIR, `${collection}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    logger.error(`Error al escribir en la colección ${collection}: ${error.message}`)
    return false
  }
}

// Insertar un documento en una colección
function insertDocument(collection, document) {
  try {
    const data = readCollection(collection)

    // Generar un ID único si no existe
    if (!document.id) {
      document.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    }

    // Añadir timestamps
    document.createdAt = new Date().toISOString()
    document.updatedAt = new Date().toISOString()

    data.push(document)
    writeCollection(collection, data)

    return { success: true, document }
  } catch (error) {
    logger.error(`Error al insertar documento en ${collection}: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Encontrar documentos en una colección
function findDocuments(collection, filter = {}) {
  try {
    const data = readCollection(collection)

    // Si no hay filtro, devolver todos los documentos
    if (Object.keys(filter).length === 0) {
      return data
    }

    // Filtrar documentos
    return data.filter((doc) => {
      for (const [key, value] of Object.entries(filter)) {
        if (doc[key] !== value) {
          return false
        }
      }
      return true
    })
  } catch (error) {
    logger.error(`Error al buscar documentos en ${collection}: ${error.message}`)
    return []
  }
}

// Encontrar un documento por ID
function findDocumentById(collection, id) {
  try {
    const data = readCollection(collection)
    return data.find((doc) => doc.id === id) || null
  } catch (error) {
    logger.error(`Error al buscar documento por ID en ${collection}: ${error.message}`)
    return null
  }
}

// Actualizar un documento por ID
function updateDocumentById(collection, id, updates) {
  try {
    const data = readCollection(collection)
    const index = data.findIndex((doc) => doc.id === id)

    if (index === -1) {
      return { success: false, error: "Documento no encontrado" }
    }

    // Actualizar el documento
    data[index] = {
      ...data[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    writeCollection(collection, data)
    return { success: true, document: data[index] }
  } catch (error) {
    logger.error(`Error al actualizar documento en ${collection}: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Eliminar un documento por ID
function deleteDocumentById(collection, id) {
  try {
    const data = readCollection(collection)
    const index = data.findIndex((doc) => doc.id === id)

    if (index === -1) {
      return { success: false, error: "Documento no encontrado" }
    }

    // Eliminar el documento
    const deletedDocument = data.splice(index, 1)[0]
    writeCollection(collection, data)

    return { success: true, document: deletedDocument }
  } catch (error) {
    logger.error(`Error al eliminar documento en ${collection}: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Eliminar documentos por filtro
function deleteDocuments(collection, filter = {}) {
  try {
    let data = readCollection(collection)
    const initialLength = data.length

    // Si no hay filtro, no eliminar nada
    if (Object.keys(filter).length === 0) {
      return { success: false, error: "Filtro vacío, no se eliminó ningún documento" }
    }

    // Filtrar documentos a mantener
    data = data.filter((doc) => {
      for (const [key, value] of Object.entries(filter)) {
        if (doc[key] === value) {
          return false
        }
      }
      return true
    })

    const deletedCount = initialLength - data.length
    writeCollection(collection, data)

    return { success: true, deletedCount }
  } catch (error) {
    logger.error(`Error al eliminar documentos en ${collection}: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Contar documentos en una colección
function countDocuments(collection, filter = {}) {
  try {
    const documents = findDocuments(collection, filter)
    return documents.length
  } catch (error) {
    logger.error(`Error al contar documentos en ${collection}: ${error.message}`)
    return 0
  }
}

// Exportar funciones
module.exports = {
  initializeFileDatabase,
  readCollection,
  writeCollection,
  insertDocument,
  findDocuments,
  findDocumentById,
  updateDocumentById,
  deleteDocumentById,
  deleteDocuments,
  countDocuments,
}
