// Constantes
var MAX_CACHE_SIZE = 100;
var CACHE_EXPIRY_MS = 1000 * 60 * 5; // 5 minutos

// Funciones principales del bot
function doPost(e) {
  var startTime = new Date().getTime();
  var updateId = "desconocido";
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No hay datos en la solicitud POST");
    }

    var update;
    try {
      update = JSON.parse(e.postData.contents);
      updateId = update.update_id || "sin_id";
    } catch (error) {
      throw new Error("Error al parsear JSON: " + error.message);
    }

    if (!update.update_id) {
      throw new Error("Update ID no encontrado en el request");
    }
    
    logToSheet("=== NUEVO REQUEST (Update ID: " + updateId + ") ===", "INFO");
    
    // Log del mensaje recibido de forma segura
    try {
      var messageLog = {
        update_id: update.update_id,
        message_id: update.message?.message_id,
        from: update.message?.from?.first_name + 
              (update.message?.from?.username ? " (@" + update.message?.from?.username + ")" : ""),
        chat: update.message?.chat?.title || "Chat privado",
        text: update.message?.text || "<no text>"
      };
      logToSheet("📥 Mensaje recibido: " + JSON.stringify(messageLog), "DEBUG");
    } catch (logError) {
      logToSheet("⚠️ Error al logear mensaje: " + logError.message, "WARN");
    }
    
    // Verificar duplicados inmediatamente
    if (isUpdateProcessed(update.update_id)) {
      logToSheet("⚠️ Update " + update.update_id + " ya procesado (ignorando)", "INFO");
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        status: "ignored_duplicate"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Marcar como procesado inmediatamente
    markUpdateAsProcessed(update.update_id);
    logToSheet("✓ Update marcado para procesamiento", "DEBUG");
    
    // Procesar el mensaje
    var result = processUpdate(update);
    
    var endTime = new Date().getTime();
    var processingTime = endTime - startTime;
    
    if (result.ok) {
      logToSheet("✓ Mensaje procesado exitosamente en " + processingTime + "ms", "INFO");
    } else {
      logToSheet("⚠️ Mensaje procesado con advertencias en " + processingTime + "ms", "WARN");
    }
    
    logToSheet("=== FIN DEL REQUEST ===", "INFO");
    
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      result: result,
      processing_time_ms: processingTime
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    var endTime = new Date().getTime();
    var processingTime = endTime - startTime;
    var errorMessage = error.message || error.toString();
    
    logToSheet("✗ Error procesando update " + updateId + ": " + errorMessage, "ERROR");
    logToSheet("  Tiempo hasta error: " + processingTime + "ms", "ERROR");
    logToSheet("=== FIN DEL REQUEST CON ERROR ===", "ERROR");
    
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: errorMessage,
      processing_time_ms: processingTime
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function processUpdate(update) {
  try {
    if (!update || !update.message || !update.message.chat || !update.message.chat.id) {
      throw new Error("Update inválido o falta chat_id");
    }

    var message = update.message;
    var chatId = message.chat.id;
    var text = message.text || '';
    var from = message.from ? (message.from.first_name || 'Usuario') : 'Usuario';
    
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
    
    var result = sendTelegramMessage(chatId, responseText);
    
    if (!result.ok) {
      throw new Error("Error al enviar mensaje: " + result.description);
    }
    
    return result;
  } catch (error) {
    logToSheet("✗ Error en processUpdate: " + error.message, "ERROR");
    throw error;
  }
}

function sendTelegramMessage(chatId, text) {
  if (!chatId || !text) {
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
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode !== 200) {
      throw new Error("HTTP Error " + responseCode);
    }
    
    return JSON.parse(responseText);
  } catch (error) {
    logToSheet("✗ Error al enviar mensaje: " + error.message, "ERROR");
    throw error;
  }
}

// Funciones de persistencia
function saveMessage(message) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Mensajes");
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet("Mensajes");
      sheet.appendRow(["Timestamp", "Message ID", "Chat ID", "From", "Text"]);
    }
    
    sheet.appendRow([
      new Date(),
      message.message_id,
      message.chat.id,
      message.from ? message.from.first_name : "Unknown",
      message.text || ""
    ]);
    
    logToSheet("Mensaje " + message.message_id + " guardado", "INFO");
  } catch (error) {
    throw new Error("Error al guardar mensaje: " + error.message);
  }
}

function isUpdateProcessed(updateId) {
  try {
    var props = PropertiesService.getScriptProperties();
    var cacheStr = props.getProperty('updateCache');
    var cache = cacheStr ? JSON.parse(cacheStr) : {};
    
    var now = new Date().getTime();
    var updateTime = cache[updateId];
    
    if (!updateTime) {
      logToSheet("Update " + updateId + " no encontrado en cache", "DEBUG");
      return false;
    }
    
    // Limpiar entradas antiguas
    Object.keys(cache).forEach(function(id) {
      if (now - cache[id] > CACHE_EXPIRY_MS) {
        delete cache[id];
      }
    });
    
    props.setProperty('updateCache', JSON.stringify(cache));
    return true;
  } catch (e) {
    logToSheet("Error al verificar cache: " + e.message, "ERROR");
    return false;
  }
}

function markUpdateAsProcessed(updateId) {
  try {
    var props = PropertiesService.getScriptProperties();
    var cache = JSON.parse(props.getProperty('updateCache') || '{}');
    
    cache[updateId] = new Date().getTime();
    
    // Mantener solo los últimos MAX_CACHE_SIZE updates
    var ids = Object.keys(cache).sort((a, b) => cache[b] - cache[a]);
    while (ids.length > MAX_CACHE_SIZE) {
      delete cache[ids.pop()];
    }
    
    props.setProperty('updateCache', JSON.stringify(cache));
  } catch (e) {
    logToSheet("Error al marcar update: " + e.message, "ERROR");
  }
}

// Funciones de configuración y diagnóstico
function resetWebhook() {
  logToSheet("Iniciando configuracion de webhook en URL: " + WEBHOOK_URL, "INFO");
  
  try {
    // Primero obtener info actual
    var currentInfo = UrlFetchApp.fetch(TELEGRAM_URL + "/getWebhookInfo");
    logToSheet("Estado actual del webhook: " + currentInfo.getContentText(), "INFO");
    
    // Eliminar webhook existente
    UrlFetchApp.fetch(TELEGRAM_URL + "/deleteWebhook");
    Utilities.sleep(2000);
    
    // Configurar nuevo webhook
    var webhookParams = {
      url: WEBHOOK_URL,
      allowed_updates: ["message"]
    };
    
    var response = UrlFetchApp.fetch(TELEGRAM_URL + "/setWebhook", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(webhookParams)
    });
    
    var result = JSON.parse(response.getContentText());
    logToSheet("Webhook configurado: " + JSON.stringify(result), "INFO");
    return result;
    
  } catch (error) {
    logToSheet("Error al configurar webhook: " + error.message, "ERROR");
    throw error;
  }
}

function getWebhookInfo() {
  try {
    var response = UrlFetchApp.fetch(TELEGRAM_URL + "/getWebhookInfo");
    var info = JSON.parse(response.getContentText());
    logToSheet("Info del webhook: " + JSON.stringify(info), "INFO");
    return info;
  } catch (error) {
    logToSheet("Error al obtener info del webhook: " + error.message, "ERROR");
    throw error;
  }
}

function testBot() {
  try {
    logToSheet("=== Iniciando prueba del bot ===", "INFO");
    
    // 1. Verificar token
    if (!TELEGRAM_TOKEN) {
      throw new Error("Token no configurado");
    }
    logToSheet("Token configurado: " + TELEGRAM_TOKEN.substring(0, 5) + "...", "INFO");
    
    // 2. Verificar URL
    if (!TELEGRAM_URL || !TELEGRAM_URL.startsWith("https://api.telegram.org/bot")) {
      throw new Error("URL mal formada: " + TELEGRAM_URL);
    }
    logToSheet("URL base: " + TELEGRAM_URL, "INFO");
    
    // 3. Probar getMe
    var response = UrlFetchApp.fetch(TELEGRAM_URL + "/getMe");
    var botInfo = JSON.parse(response.getContentText());
    logToSheet("Bot info: " + JSON.stringify(botInfo), "INFO");
    
    // 4. Enviar mensaje de prueba
    logToSheet("Enviando mensaje de prueba...", "INFO");
    var result = sendTelegramMessage(
      GRUPO_ID || "-4687334611",
      "Test de conexión del bot"
    );
    logToSheet("Respuesta de envío: " + JSON.stringify(result), "INFO");
    
    return {
      ok: true,
      bot_info: botInfo,
      test_message: result
    };
  } catch (error) {
    logToSheet("Error en prueba del bot: " + error.message, "ERROR");
    throw error;
  }
}

// Sistema de logging
function logToSheet(message, level) {
  try {
    // Validar y limpiar el mensaje
    if (message === undefined || message === null) {
      message = "<mensaje vacío>";
    }
    
    if (typeof message === 'object') {
      try {
        message = JSON.stringify(message, null, 2);
      } catch (e) {
        message = "[Objeto no serializable]";
      }
    }
    
    // Limpiar el mensaje
    message = message.toString()
      .replace(/\\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\\"/g, '"')
      .trim();
    
    // Validar el nivel de log
    level = (level || "INFO").toUpperCase();
    if (!["INFO", "DEBUG", "WARN", "ERROR"].includes(level)) {
      level = "INFO";
    }
    
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LOG_SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(LOG_SHEET_NAME);
      sheet.appendRow(["Timestamp", "Level", "Message"]);
      sheet.getRange("A1:C1").setBackground("#f3f3f3").setFontWeight("bold");
    }
    
    // Formatear timestamp
    var now = new Date();
    var timestamp = Utilities.formatDate(now, "GMT-3", "dd/MM/yyyy HH:mm:ss");
    
    // Insertar el log
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, 3).setValues([[timestamp, level, message]]);
    
    // Log a consola
    var consoleMessage = timestamp + " | " + level.padEnd(5) + " | " + message;
    if (level === "ERROR") {
      console.error(consoleMessage);
    } else if (level === "WARN") {
      console.warn(consoleMessage);
    } else {
      console.log(consoleMessage);
    }
    
  } catch (error) {
    console.error("Error al escribir log:", error);
    console.error("Mensaje original:", message);
    
    // Intentar un último log de emergencia
    try {
      var emergencyMessage = "⚠️ Error en sistema de logs: " + error.message;
      var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LOG_SHEET_NAME);
      if (sheet) {
        sheet.insertRowBefore(2);
        sheet.getRange(2, 1, 1, 3).setValues([[new Date().toLocaleString(), "ERROR", emergencyMessage]]);
      }
    } catch (e) {
      console.error("Error crítico en sistema de logs:", e);
    }
  }
}
