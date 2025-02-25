// Variables globales
var START_TIME = new Date();

// Comandos disponibles
var COMMANDS = {
  start: {
    description: "Iniciar el bot",
    handler: handleStart
  },
  help: {
    description: "Mostrar ayuda",
    handler: handleHelp
  },
  status: {
    description: "Ver estado del bot",
    handler: handleStatus
  }
};

function sendMessage(chatId, text, options) {
  options = options || {};
  try {
    var payload = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || "HTML"
    };
    
    if (options.reply_to_message_id) {
      payload.reply_to_message_id = options.reply_to_message_id;
    }
    
    var data = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(TELEGRAM_URL + "/sendMessage", data);
    var result = JSON.parse(response.getContentText());
    
    if (!result.ok) {
      throw new Error("Error al enviar mensaje: " + result.description);
    }
    
    return result;
  } catch (error) {
    logToSheet("Error al enviar mensaje: " + error.toString(), "ERROR");
    throw error;
  }
}

function handleCommand(message) {
  try {
    if (!message.text || !message.text.startsWith("/")) {
      return null;
    }
    
    var parts = message.text.split(" ");
    var commandText = parts[0].toLowerCase();
    var command = commandText.split("@")[0].substring(1);
    var args = parts.slice(1);
    
    if (COMMANDS[command]) {
      logToSheet("Ejecutando comando: " + command, "INFO");
      return COMMANDS[command].handler(message, args);
    }
    
    return sendMessage(
      message.chat.id,
      "Comando no reconocido. Usa /help para ver los comandos disponibles.",
      { reply_to_message_id: message.message_id }
    );
  } catch (error) {
    logToSheet("Error al manejar comando: " + error.toString(), "ERROR");
    return sendMessage(
      message.chat.id,
      "Error al procesar el comando. Por favor, intenta de nuevo.",
      { reply_to_message_id: message.message_id }
    );
  }
}

function handleStart(message) {
  var username = message.from.first_name || "usuario";
  var text = "Hola " + username + "!\n\n" +
             "Soy un bot de ejemplo que puede:\n" +
             "- Responder a comandos basicos\n" +
             "- Guardar mensajes en una hoja\n" +
             "- Manejar grupos y chats privados\n\n" +
             "Usa /help para ver todos los comandos disponibles.";
             
  return sendMessage(message.chat.id, text);
}

function handleHelp(message) {
  var text = "Comandos disponibles:\n\n";
  
  Object.keys(COMMANDS).forEach(function(cmd) {
    text += "/" + cmd + " - " + COMMANDS[cmd].description + "\n";
  });
  
  text += "\nPuedes usar estos comandos en chat privado o en grupos.";
  
  return sendMessage(message.chat.id, text);
}

function handleStatus(message) {
  var uptime = new Date() - START_TIME;
  var hours = Math.floor(uptime / 3600000);
  var minutes = Math.floor((uptime % 3600000) / 60000);
  
  var text = "Estado del Bot:\n\n" +
             "Uptime: " + hours + "h " + minutes + "m\n" +
             "Updates en cache: " + Object.keys(updateIds).length + "\n" +
             "Ultima actualizacion: " + new Date().toISOString();
             
  return sendMessage(message.chat.id, text);
}

function processUpdate(update) {
  try {
    if (!update.message) {
      logToSheet("No es un mensaje valido o es otro tipo de update", "DEBUG");
      return {
        ok: false,
        error: "Not a message update"
      };
    }

    var message = update.message;
    logToSheet("Procesando mensaje: " + JSON.stringify(message), "DEBUG");
    
    // Siempre respondemos al mensaje para probar
    sendMessage(
      message.chat.id,
      "Recibí tu mensaje: " + (message.text || ""),
      { reply_to_message_id: message.message_id }
    );
    
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = ss.getSheetByName("Messages") || ss.insertSheet("Messages");
      
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          "Fecha",
          "Update ID",
          "Message ID",
          "Chat ID",
          "Chat Type",
          "User ID",
          "Username",
          "Message Text"
        ]);
        sheet.setFrozenRows(1);
        sheet.getRange("A1:H1").setBackground("#f3f3f3").setFontWeight("bold");
      }
      
      sheet.appendRow([
        new Date(),
        update.update_id,
        message.message_id,
        message.chat.id,
        message.chat.type,
        message.from ? message.from.id : "",
        message.from ? message.from.username || message.from.first_name : "",
        message.text || ""
      ]);
      
      logToSheet("Mensaje " + message.message_id + " guardado", "INFO");
    } catch (sheetError) {
      logToSheet("Error al guardar en hoja: " + sheetError.toString(), "ERROR");
      logToSheet("Stack trace: " + sheetError.stack, "ERROR");
    }

    return {
      ok: true,
      message_id: message.message_id,
      text: message.text || ""
    };
  } catch (error) {
    logToSheet("Error procesando update: " + error.toString(), "ERROR");
    logToSheet("Stack trace: " + error.stack, "ERROR");
    return {
      ok: false,
      error: error.message
    };
  }
}

var updateIds = {};
var maxCacheSize = 100;

function cleanOldUpdates() {
  var now = new Date().getTime();
  Object.keys(updateIds).forEach(function(key) {
    if (now - updateIds[key] > 3600000) { // 1 hora
      delete updateIds[key];
    }
  });
}

function logToSheet(message, type) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("Logs");
    
    if (!sheet) {
      sheet = ss.insertSheet("Logs");
      sheet.appendRow(["Fecha", "Tipo", "Mensaje"]);
      sheet.setFrozenRows(1);
      sheet.getRange("A1:C1").setBackground("#f3f3f3").setFontWeight("bold");
    }
    
    sheet.appendRow([new Date(), type, message]);
    Logger.log(type + ": " + message);
  } catch (error) {
    Logger.log("Error al guardar log: " + error.toString());
    Logger.log("Mensaje original: " + type + " - " + message);
  }
}
