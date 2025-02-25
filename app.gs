// Cache para evitar procesar updates duplicados
var MAX_CACHE_SIZE = 100;
var CACHE_EXPIRY_MS = 1000 * 60 * 5; // 5 minutos

function isUpdateProcessed(updateId) {
  try {
    var props = PropertiesService.getScriptProperties();
    var cache = props.getProperty('updateCache');
    
    if (!cache) {
      logToSheet("Cache no encontrado, creando nuevo", "DEBUG");
      return false;
    }
    
    try {
      cache = JSON.parse(cache);
    } catch (e) {
      logToSheet("Error al parsear cache, reiniciando: " + e.toString(), "ERROR");
      props.deleteProperty('updateCache');
      return false;
    }
    
    if (!cache || typeof cache !== 'object') {
      logToSheet("Cache inválido, reiniciando", "DEBUG");
      props.deleteProperty('updateCache');
      return false;
    }
    
    var timestamp = cache[updateId];
    if (!timestamp) {
      logToSheet("Update " + updateId + " no encontrado en cache", "DEBUG");
      return false;
    }
    
    // Verificar si expiró
    var now = new Date().getTime();
    if (now - timestamp > CACHE_EXPIRY_MS) {
      logToSheet("Cache expirado para update " + updateId, "DEBUG");
      delete cache[updateId];
      props.setProperty('updateCache', JSON.stringify(cache));
      return false;
    }
    
    logToSheet("Update " + updateId + " encontrado en cache", "DEBUG");
    return true;
  } catch (e) {
    logToSheet("Error al verificar cache: " + e.toString(), "ERROR");
    return false;
  }
}

function markUpdateAsProcessed(updateId) {
  try {
    var props = PropertiesService.getScriptProperties();
    var cache = props.getProperty('updateCache');
    
    try {
      cache = cache ? JSON.parse(cache) : {};
    } catch (e) {
      logToSheet("Error al parsear cache, reiniciando: " + e.toString(), "ERROR");
      cache = {};
    }
    
    if (typeof cache !== 'object') {
      cache = {};
    }
    
    cache[updateId] = new Date().getTime();
    
    // Limpiar entradas antiguas
    var now = new Date().getTime();
    Object.keys(cache).forEach(function(id) {
      if (now - cache[id] > CACHE_EXPIRY_MS) {
        delete cache[id];
      }
    });
    
    // Mantener solo los últimos 100 updates
    var ids = Object.keys(cache).sort((a, b) => cache[b] - cache[a]);
    while (ids.length > MAX_CACHE_SIZE) {
      delete cache[ids.pop()];
    }
    
    props.setProperty('updateCache', JSON.stringify(cache));
    logToSheet("Update " + updateId + " marcado como procesado", "DEBUG");
  } catch (e) {
    logToSheet("Error al marcar update como procesado: " + e.toString(), "ERROR");
  }
}

function getDeploymentUrl() {
  var url = WEBHOOK_URL;  // Esta viene de config.gs
  logToSheet("URL configurada: " + url, "INFO");
  
  // Validar formato de URL
  if (!url.startsWith('https://script.google.com/macros/s/')) {
    logToSheet("Error: URL no válida, debe comenzar con 'https://script.google.com/macros/s/'", "ERROR");
    return null;
  }
  
  if (!url.endsWith('/exec')) {
    logToSheet("Error: URL no válida, debe terminar en '/exec'", "ERROR");
    return null;
  }
  
  return url;
}

function validateWebhookUrl() {
  var url = getDeploymentUrl();
  if (!url) {
    logToSheet("La URL del webhook no es válida. Verifica WEBHOOK_URL en config.gs", "ERROR");
    return false;
  }
  return true;
}

function getWebhookInfo() {
  try {
    var response = UrlFetchApp.fetch(TELEGRAM_URL + "/getWebhookInfo");
    var result = JSON.parse(response.getContentText());
    logToSheet("Estado actual del webhook: " + JSON.stringify(result), "INFO");
    return result;
  } catch (error) {
    logToSheet("Error al obtener info del webhook: " + error.toString(), "ERROR");
    throw error;
  }
}

function testWebhookEndpoint() {
  try {
    if (!validateWebhookUrl()) {
      return {
        ok: false,
        error: "Invalid deployment URL"
      };
    }
    
    var scriptUrl = getDeploymentUrl();
    logToSheet("Probando webhook en URL: " + scriptUrl, "INFO");
    
    // Intentamos hacer un GET a nuestro endpoint
    var options = {
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(scriptUrl, options);
    var responseCode = response.getResponseCode();
    var contentText = response.getContentText();
    
    logToSheet("Código de respuesta: " + responseCode, "INFO");
    
    try {
      var result = JSON.parse(contentText);
      logToSheet("Respuesta del endpoint: " + JSON.stringify(result), "INFO");
    } catch (e) {
      logToSheet("Error: El endpoint no devolvió JSON válido", "ERROR");
      logToSheet("Contenido recibido: " + contentText.substring(0, 100) + "...", "ERROR");
      return {
        ok: false,
        error: "Invalid JSON response",
        response: contentText.substring(0, 100) + "..."
      };
    }
    
    // Verificamos el webhook en Telegram
    var info = getWebhookInfo();
    logToSheet("Verificación del webhook en Telegram: " + JSON.stringify(info), "INFO");
    
    return {
      endpoint: {
        url: scriptUrl,
        code: responseCode,
        response: result
      },
      webhook: info
    };
  } catch (error) {
    logToSheet("Error al probar el webhook: " + error.toString(), "ERROR");
    logToSheet("Stack trace: " + error.stack, "ERROR");
    throw error;
  }
}

function resetWebhook() {
  try {
    // 1. Obtener URL del script
    var url = getDeploymentUrl();
    logToSheet("URL configurada: " + url, "INFO");
    
    // 2. Eliminar webhook anterior
    var deleteUrl = TELEGRAM_URL + "/deleteWebhook";
    var deleteResponse = UrlFetchApp.fetch(deleteUrl);
    var deleteResult = JSON.parse(deleteResponse.getContentText());
    
    if (!deleteResult.ok) {
      throw new Error("Error al eliminar webhook: " + deleteResult.description);
    }
    logToSheet("Webhook anterior eliminado correctamente", "INFO");
    
    // 3. Configurar nuevo webhook
    var setUrl = TELEGRAM_URL + "/setWebhook";
    var payload = {
      url: url,
      allowed_updates: ["message"],
      drop_pending_updates: true
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    logToSheet("Iniciando configuracion de webhook en URL: " + url, "INFO");
    var response = UrlFetchApp.fetch(setUrl, options);
    var result = JSON.parse(response.getContentText());
    
    if (!result.ok) {
      throw new Error("Error al configurar webhook: " + result.description);
    }
    
    // 4. Verificar estado
    var info = getWebhookInfo();
    logToSheet("Estado actual del webhook: " + JSON.stringify(info), "INFO");
    
    return {
      ok: true,
      webhook: info
    };
    
  } catch (error) {
    logToSheet("Error al resetear webhook: " + error.toString(), "ERROR");
    return {
      ok: false,
      error: error.toString()
    };
  }
}

function doPost(e) {
  var startTime = new Date().getTime();
  logToSheet("=== NUEVO REQUEST POST ===", "INFO");
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No hay datos en la solicitud POST");
    }

    var update;
    try {
      update = JSON.parse(e.postData.contents);
      logToSheet("Update recibido: " + JSON.stringify(update, null, 2), "DEBUG");
    } catch (error) {
      throw new Error("Error al parsear JSON: " + error.message);
    }

    if (!update.update_id) {
      throw new Error("Update ID no encontrado en el request");
    }
    
    logToSheet("Procesando update_id: " + update.update_id, "INFO");
    
    // Verificar duplicados
    if (isUpdateProcessed(update.update_id)) {
      logToSheet("Update " + update.update_id + " ya procesado, ignorando", "INFO");
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        duplicate: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Procesar el mensaje
    var result = processUpdate(update);
    
    // Solo marcar como procesado si fue exitoso
    if (result && result.ok) {
      markUpdateAsProcessed(update.update_id);
      logToSheet("✓ Update " + update.update_id + " procesado y marcado", "INFO");
    }
    
    var endTime = new Date().getTime();
    logToSheet("Tiempo total: " + (endTime - startTime) + "ms", "INFO");
    logToSheet("=== FIN DEL REQUEST ===", "INFO");
    
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      result: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    var errorMessage = error.message || error.toString();
    logToSheet("✗ Error en doPost: " + errorMessage, "ERROR");
    logToSheet("=== FIN DEL REQUEST CON ERROR ===", "ERROR");
    
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: errorMessage
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function processUpdate(update) {
  var updateId = update?.update_id || "desconocido";
  logToSheet("=== PROCESANDO UPDATE " + updateId + " ===", "INFO");
  
  try {
    if (!update || !update.message || !update.message.chat || !update.message.chat.id) {
      throw new Error("Update inválido o falta chat_id");
    }

    var message = update.message;
    var chatId = message.chat.id;
    var text = message.text || '';
    var from = message.from ? (message.from.first_name || 'Usuario') : 'Usuario';
    
    logToSheet("Detalles del mensaje:", "INFO");
    logToSheet("• Chat ID: " + chatId + " (" + (message.chat.title || "Chat privado") + ")", "INFO");
    logToSheet("• De: " + from + (message.from?.username ? " (@" + message.from.username + ")" : ""), "INFO");
    logToSheet("• Texto: " + text, "INFO");
    
    // Guardar mensaje
    try {
      saveMessage(message);
      logToSheet("✓ Mensaje guardado correctamente", "INFO");
    } catch (saveError) {
      logToSheet("✗ Error al guardar mensaje: " + saveError.message, "ERROR");
    }
    
    // Enviar respuesta
    var responseText = "¡Hola " + from + "! \nRecibí tu mensaje: " + text;
    logToSheet("Enviando respuesta: " + responseText, "INFO");
    
    var startTime = new Date().getTime();
    var result = sendTelegramMessage(chatId, responseText);
    var endTime = new Date().getTime();
    
    if (!result.ok) {
      throw new Error("Error al enviar mensaje: " + result.description);
    }
    
    logToSheet("✓ Respuesta enviada (ID: " + result.result.message_id + ") en " + (endTime - startTime) + "ms", "INFO");
    logToSheet("=== FIN DEL PROCESAMIENTO ===", "INFO");
    
    return result;
  } catch (error) {
    logToSheet("✗ Error en processUpdate: " + error.message, "ERROR");
    logToSheet("=== FIN DEL PROCESAMIENTO CON ERROR ===", "ERROR");
    throw error;
  }
}

function sendTelegramMessage(chatId, text) {
  var startTime = new Date().getTime();
  var messageId = "pendiente";
  
  logToSheet("=== Enviando mensaje a Telegram ===", "INFO");
  logToSheet("  Chat ID: " + chatId, "DEBUG");
  logToSheet("  Texto: " + text, "DEBUG");
  
  if (!chatId || !text) {
    logToSheet("✗ Error: Parámetros inválidos", "ERROR");
    throw new Error("ChatId y texto son requeridos");
  }

  try {
    var url = TELEGRAM_URL + "/sendMessage";
    var payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    logToSheet("Enviando request...", "DEBUG");
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    logToSheet("Respuesta recibida:", "DEBUG");
    logToSheet("  HTTP: " + responseCode, "DEBUG");
    logToSheet("  Body: " + responseText, "DEBUG");
    
    if (responseCode !== 200) {
      throw new Error("HTTP Error " + responseCode);
    }
    
    var responseData = JSON.parse(responseText);
    messageId = responseData.result?.message_id || "error";
    
    if (!responseData.ok) {
      throw new Error(responseData.description || "Error desconocido");
    }
    
    var endTime = new Date().getTime();
    logToSheet("✓ Mensaje " + messageId + " enviado en " + (endTime - startTime) + "ms", "INFO");
    
    return responseData;
  } catch (error) {
    logToSheet("✗ Error al enviar mensaje " + messageId + ": " + error.toString(), "ERROR");
    throw error;
  } finally {
    logToSheet("=== Fin del envío ===", "INFO");
  }
}

function saveMessage(message) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Mensajes");
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet("Mensajes");
      sheet.appendRow(["Timestamp", "Message ID", "Chat ID", "From", "Text"]);
    }
    
    var row = [
      new Date().toLocaleString(),
      message.message_id,
      message.chat.id,
      message.from ? message.from.first_name : "Unknown",
      message.text || ""
    ];
    
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, row.length).setValues([row]);
    logToSheet("Mensaje " + message.message_id + " guardado", "INFO");
  } catch (error) {
    logToSheet("Error al guardar mensaje: " + error.toString(), "ERROR");
  }
}

function checkBotConfig() {
  try {
    logToSheet("=== Verificando configuración del bot ===", "INFO");
    
    // 1. Verificar token
    var getMeUrl = TELEGRAM_URL + "/getMe";
    var response = UrlFetchApp.fetch(getMeUrl);
    var botInfo = JSON.parse(response.getContentText());
    
    if (!botInfo.ok) {
      logToSheet("Error: Token inválido", "ERROR");
      return false;
    }
    
    logToSheet("Bot encontrado: @" + botInfo.result.username, "INFO");
    
    // 2. Verificar webhook
    var info = getWebhookInfo();
    if (!info.ok) {
      logToSheet("Error al obtener información del webhook", "ERROR");
      return false;
    }
    
    logToSheet("URL del webhook: " + info.result.url, "INFO");
    logToSheet("Mensajes pendientes: " + info.result.pending_update_count, "INFO");
    
    if (info.result.last_error_date) {
      var errorDate = new Date(info.result.last_error_date * 1000);
      logToSheet("Último error: " + info.result.last_error_message + " (" + errorDate.toISOString() + ")", "WARN");
    }
    
    return true;
  } catch (error) {
    logToSheet("Error al verificar configuración: " + error.toString(), "ERROR");
    return false;
  }
}

function diagnosticoCompleto() {
  Logger.log("=== DIAGNÓSTICO DE BOT ===");
  
  // 1. Verificar configuración
  var configOk = checkBotConfig();
  if (!configOk) {
    Logger.log("Error en la configuración del bot");
    return;
  }
  
  // 2. Probar endpoint
  var test = testWebhookEndpoint();
  Logger.log(JSON.stringify(test, null, 2));
  
  // 3. Resetear webhook si es necesario
  if (!test.webhook || !test.webhook.ok) {
    Logger.log("Reseteando webhook...");
    var reset = resetWebhook();
    Logger.log(JSON.stringify(reset, null, 2));
  }
}

function verificarBot() {
  try {
    logToSheet("=== Verificando estado del bot ===", "INFO");
    
    // 1. Verificar token
    if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === "TU_TOKEN_AQUI") {
      logToSheet("Error: Token no configurado", "ERROR");
      return false;
    }
    logToSheet("Token configurado: " + TELEGRAM_TOKEN.substring(0, 5) + "...", "INFO");
    
    // 2. Verificar URL
    if (!TELEGRAM_URL || !TELEGRAM_URL.startsWith("https://api.telegram.org/bot")) {
      logToSheet("Error: URL mal formada: " + TELEGRAM_URL, "ERROR");
      return false;
    }
    logToSheet("URL base: " + TELEGRAM_URL, "INFO");
    
    // 3. Probar getMe
    var getMeUrl = TELEGRAM_URL + "/getMe";
    var response = UrlFetchApp.fetch(getMeUrl);
    var botInfo = JSON.parse(response.getContentText());
    
    if (!botInfo.ok) {
      logToSheet("Error: " + botInfo.description, "ERROR");
      return false;
    }
    
    logToSheet("Bot encontrado: @" + botInfo.result.username, "INFO");
    
    // 4. Verificar permisos
    var webhookInfo = getWebhookInfo();
    logToSheet("Webhook actual: " + JSON.stringify(webhookInfo), "DEBUG");
    
    if (!webhookInfo.ok) {
      logToSheet("Error al obtener webhook info: " + webhookInfo.description, "ERROR");
      return false;
    }
    
    return true;
  } catch (error) {
    logToSheet("Error al verificar bot: " + error.toString(), "ERROR");
    logToSheet("Stack trace: " + error.stack, "ERROR");
    return false;
  }
}

function testBot() {
  try {
    logToSheet("=== Iniciando prueba del bot ===", "INFO");
    
    // 1. Verificar token
    if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === "TU_TOKEN_AQUI") {
      throw new Error("Token no configurado");
    }
    logToSheet("Token configurado: " + TELEGRAM_TOKEN.substring(0, 5) + "...", "INFO");
    
    // 2. Verificar URL
    if (!TELEGRAM_URL || !TELEGRAM_URL.startsWith("https://api.telegram.org/bot")) {
      throw new Error("URL mal formada: " + TELEGRAM_URL);
    }
    logToSheet("URL base: " + TELEGRAM_URL, "INFO");
    
    // 3. Probar getMe
    var getMeUrl = TELEGRAM_URL + "/getMe";
    var response = UrlFetchApp.fetch(getMeUrl);
    var botInfo = JSON.parse(response.getContentText());
    
    if (!botInfo.ok) {
      throw new Error("Error en getMe: " + JSON.stringify(botInfo));
    }
    
    logToSheet("Bot info: " + JSON.stringify(botInfo), "INFO");
    
    // 4. Probar envío de mensaje
    var testMessage = {
      chat_id: -4687334611, // ID del grupo
      text: "Test de conexión del bot"
    };
    
    var sendUrl = TELEGRAM_URL + "/sendMessage";
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(testMessage),
      muteHttpExceptions: true
    };
    
    logToSheet("Enviando mensaje de prueba...", "INFO");
    var sendResponse = UrlFetchApp.fetch(sendUrl, options);
    var sendResult = JSON.parse(sendResponse.getContentText());
    
    logToSheet("Respuesta de envío: " + JSON.stringify(sendResult), "INFO");
    
    return {
      ok: true,
      botInfo: botInfo,
      sendResult: sendResult
    };
    
  } catch (error) {
    logToSheet("Error en prueba: " + error.toString(), "ERROR");
    return {
      ok: false,
      error: error.toString()
    };
  }
}

function logToSheet(message, level) {
  try {
    // Si el mensaje es un objeto, convertirlo a string
    if (typeof message === 'object') {
      message = JSON.stringify(message, null, 2);
    }
    
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LOG_SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(LOG_SHEET_NAME);
      sheet.appendRow(["Timestamp", "Level", "Message"]);
    }
    
    var timestamp = new Date().toLocaleString();
    var logMessage = message.toString().replace(/\\n/g, ' ').replace(/\n/g, ' ');
    
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, 3).setValues([[timestamp, level || "INFO", logMessage]]);
    
    // También mostrar en consola para debugging
    console.log(timestamp + " | " + (level || "INFO") + " | " + logMessage);
  } catch (error) {
    console.error("Error al escribir log:", error, "Mensaje original:", message);
  }
}

function clearUpdateCache() {
  try {
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty('updateCache');
    logToSheet("Cache de updates limpiado", "INFO");
    return true;
  } catch (error) {
    logToSheet("Error al limpiar cache: " + error.toString(), "ERROR");
    return false;
  }
}
