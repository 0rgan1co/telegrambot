// Funciones principales de Telegram
function getChatId() {
  var url = TELEGRAM_API_URL + "/getUpdates";
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true
    });
    var responseText = response.getContentText();
    Logger.log("Respuesta de getUpdates: " + responseText);

    var jsonResponse = JSON.parse(responseText);
    if (jsonResponse.ok && jsonResponse.result.length > 0) {
      var chatId = jsonResponse.result[0].message.chat.id;
      Logger.log("chat_id obtenido: " + chatId);
      return String(chatId);
    } else {
      Logger.log("No se encontraron updates o la respuesta no es válida");
      return null;
    }
  } catch (error) {
    Logger.log("Error en getChatId: " + error.toString());
    return null;
  }
}

function sendMessage(text) {
  var chatId = getChatId();
  if (!chatId) {
    Logger.log("Error: No se pudo obtener el chat_id");
    return;
  }

  var url = TELEGRAM_API_URL + "/sendMessage";
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

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseData = JSON.parse(response.getContentText());
    Logger.log("Respuesta de Telegram: " + JSON.stringify(responseData));
    return responseData;
  } catch (error) {
    Logger.log("Error enviando mensaje: " + error.toString());
    return null;
  }
}

function handleCommand(command, chatId) {
  switch (command.toLowerCase()) {
    case COMANDOS.START:
      var welcomeMessage = "👋 ¡Hola! Soy tu bot de Telegram.\n\n" +
                        "Usa /ayuda para ver los comandos disponibles.";
      sendMessage(welcomeMessage);
      break;

    case COMANDOS.AYUDA:
      var helpMessage = "📋 Comandos disponibles:\n" +
                     "• /start - Iniciar el bot\n" +
                     "• /ayuda - Ver esta ayuda\n" +
                     "• /estado - Ver el estado actual";
      sendMessage(helpMessage);
      break;

    case COMANDOS.ESTADO:
      var estado = CACHE_ESTADOS[chatId] || ESTADOS.INICIAL;
      sendMessage("🔍 Tu estado actual es: " + estado);
      break;

    default:
      sendMessage("❌ Comando no reconocido. Usa /ayuda para ver los comandos disponibles.");
      break;
  }
}
