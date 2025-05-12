const { isConnected, getDataWithFallback, insertData, updateData: dbUpdateData, deleteData } = require("./database")
const fileDB = require("./file-database")
const logger = require("./logger")

// Inicializar el sistema de datos
async function initializeDataSystem() {
  // Inicializar el sistema de archivos de base de datos como respaldo
  fileDB.initializeFileDatabase()

  logger.info("Sistema de datos inicializado correctamente.")
  return true
}

// Función para obtener datos con fallback al sistema de archivos
async function getData(collection, filter = {}, sqlQuery = "", sqlParams = []) {
  try {
    // Intentar obtener datos de la base de datos MySQL si está conectada
    if (isConnected()) {
      const results = await getDataWithFallback(sqlQuery, sqlParams, [])

      // Si hay resultados, devolverlos
      if (results && results.length > 0) {
        return results
      }
    }

    // Fallback al sistema de archivos
    return fileDB.findDocuments(collection, filter)
  } catch (error) {
    logger.error(`Error al obtener datos: ${error.message}`)
    // Fallback al sistema de archivos en caso de error
    return fileDB.findDocuments(collection, filter)
  }
}

// Función para insertar datos con fallback al sistema de archivos
async function saveData(collection, data, sqlQuery = "", sqlParams = []) {
  try {
    // Intentar insertar en la base de datos MySQL si está conectada
    if (isConnected()) {
      const result = await insertData(sqlQuery, sqlParams)

      // Si la inserción fue exitosa, también guardar en el sistema de archivos como respaldo
      if (result.success) {
        fileDB.insertDocument(collection, data)
        return { success: true, id: result.insertId || data.id }
      }
    }

    // Fallback al sistema de archivos
    const result = fileDB.insertDocument(collection, data)
    return { success: result.success, id: result.document?.id }
  } catch (error) {
    logger.error(`Error al guardar datos: ${error.message}`)
    // Fallback al sistema de archivos en caso de error
    const result = fileDB.insertDocument(collection, data)
    return { success: result.success, id: result.document?.id }
  }
}

// Función para actualizar datos con fallback al sistema de archivos
async function updateData(collection, id, updates, sqlQuery = "", sqlParams = []) {
  try {
    // Intentar actualizar en la base de datos MySQL si está conectada
    if (isConnected()) {
      const result = await dbUpdateData(sqlQuery, sqlParams)

      // Si la actualización fue exitosa, también actualizar en el sistema de archivos
      if (result.success) {
        fileDB.updateDocumentById(collection, id, updates)
        return { success: true }
      }
    }

    // Fallback al sistema de archivos
    const result = fileDB.updateDocumentById(collection, id, updates)
    return { success: result.success }
  } catch (error) {
    logger.error(`Error al actualizar datos: ${error.message}`)
    // Fallback al sistema de archivos en caso de error
    const result = fileDB.updateDocumentById(collection, id, updates)
    return { success: result.success }
  }
}

// Función para eliminar datos con fallback al sistema de archivos
async function removeData(collection, id, sqlQuery = "", sqlParams = []) {
  try {
    // Intentar eliminar en la base de datos MySQL si está conectada
    if (isConnected()) {
      const result = await deleteData(sqlQuery, sqlParams)

      // Si la eliminación fue exitosa, también eliminar en el sistema de archivos
      if (result.success) {
        fileDB.deleteDocumentById(collection, id)
        return { success: true }
      }
    }

    // Fallback al sistema de archivos
    const result = fileDB.deleteDocumentById(collection, id)
    return { success: result.success }
  } catch (error) {
    logger.error(`Error al eliminar datos: ${error.message}`)
    // Fallback al sistema de archivos en caso de error
    const result = fileDB.deleteDocumentById(collection, id)
    return { success: result.success }
  }
}

// Exportar funciones
module.exports = {
  initializeDataSystem,
  getData,
  saveData,
  updateData,
  removeData,
}
