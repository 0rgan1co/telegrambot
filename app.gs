// Endpoints principales
function doGet(e) {
  return HtmlService.createHtmlOutput('Bot funcionando! 🤖');
}

/ Para verificar el webhook actual
function getWebhookInfo() {
  var token = TELEGRAM_TOKEN;
  var response = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/getWebhookInfo");
  Logger.log(response.getContentText());
}

function resetWebhook() {
  // Primero eliminar el webhook existente
  UrlFetchApp.fetch(TELEGRAM_URL + "/deleteWebhook");
  
  // Esperar un momento
  Utilities.sleep(2000);
  
  // Configurar nuevo webhook con los parámetros correctos
  var webhookParams = {
    url: WEBHOOK_URL,
    allowed_updates: ["message"]  // Solo procesar mensajes
  };
  
  var response = UrlFetchApp.fetch(TELEGRAM_URL + "/setWebhook", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(webhookParams)
  });
  
  Logger.log(response.getContentText());
}

function doGet(e) {
  Logger.log("Evento recibido: " + e);
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  sheet.appendRow([new Date(), "Evento recibido"]); // Escribe la fecha y un mensaje en la hoja
  return HtmlService.createHtmlOutput("Bot está funcionando!");
}

function testDoPost() {
  // Simular el objeto "e" que Telegram enviaría
  var e = {
    postData: {
      contents: JSON.stringify({
        message: {
          chat: {
            id: -4687334611,
            type: "group"
          },
          from: {
            id: 300304544,
            first_name: "Jorge"
          },
          text: "Test410",
          message_id: 1460,
          date: 1645678901
        }
      })
    }
  };

  // Llamar a doPost con el objeto simulado
  doPost(e);
}

function logToSheet(message, type) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LOG_SHEET_NAME);
    if (!sheet) {
      // Si la hoja de logs no existe, créala
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(LOG_SHEET_NAME);
      sheet.appendRow(["Fecha", "Tipo", "Mensaje"]); // Encabezados
    }

    // Agregar una nueva fila con el log
    sheet.appendRow([new Date(), type, message]);
  } catch (error) {
    Logger.log("Error al guardar el log: " + error.toString());
  }
}

function doPost(e) {
  try {
    logToSheet("doPost ejecutado", "Información");

    // Verificar si se recibieron datos válidos
    if (!e || !e.postData || !e.postData.contents) {
      logToSheet("Error: No se recibieron datos válidos.", "Error");
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No se recibieron datos válidos.' }));
    }

    // Parsear el contenido recibido
    var contents = JSON.parse(e.postData.contents);
    logToSheet("Contenido recibido: " + JSON.stringify(contents), "Información");

    // Verificar si es un mensaje válido
    if (!contents.message) {
      logToSheet("No es un mensaje válido.", "Información");
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'No es un mensaje válido.' }));
    }

    var message = contents.message;
    logToSheet("Mensaje recibido: " + JSON.stringify(message), "Información");

    // Filtrar solo mensajes de texto en grupos
    if (message.chat.type !== "group" || !message.text) {
      logToSheet("Mensaje ignorado: No es un mensaje de texto en un grupo.", "Información");
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'Mensaje ignorado.' }));
    }

    // Extraer todos los datos necesarios
    var datos = {
      fecha: new Date(message.date * 1000), // Convertir timestamp a fecha
      messageId: message.message_id.toString(), // Convertir a cadena para evitar problemas de comparación
      chatId: message.chat.id,
      chatType: message.chat.type,
      userId: message.from.id,
      userName: message.from.first_name,
      mensaje: message.text
    };

    logToSheet("Datos extraídos: " + JSON.stringify(datos), "Información");

    // Obtener la hoja y configurar encabezados si es necesario
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Fecha',
        'Message ID',
        'Chat ID',
        'Tipo de Chat',
        'User ID',
        'Nombre',
        'Mensaje'
      ]);
    }

    // Verificar si el mensaje ya existe en la hoja
    var messageIds = [];
    if (sheet.getLastRow() > 1) { // Solo si hay filas con datos
      messageIds = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
    }

    var isDuplicate = false;

    // Recorrer los IDs de mensajes para verificar duplicados
    for (var i = 0; i < messageIds.length; i++) {
      if (messageIds[i][0].toString() === datos.messageId) {
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      logToSheet("Mensaje duplicado ignorado: " + datos.messageId, "Información");
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'Mensaje duplicado ignorado.' }));
    }

    // Registrar el mensaje en la hoja de cálculo
    sheet.appendRow([
      datos.fecha,
      datos.messageId,
      datos.chatId,
      datos.chatType,
      datos.userId,
      datos.userName,
      datos.mensaje
    ]);

    logToSheet("Mensaje registrado: " + datos.messageId, "Información");

    // Responder a Telegram con un código de estado 200
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }));

  } catch (error) {
    logToSheet("Error en doPost: " + error.toString(), "Error");
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }));
  }
}

// Función para guardar logs en una hoja de cálculo
function logToSheet(message, type) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Logs");
    if (!sheet) {
      // Si la hoja de logs no existe, créala
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet("Logs");
      sheet.appendRow(["Fecha", "Tipo", "Mensaje"]); // Encabezados
    }

    // Agregar una nueva fila con el log
    sheet.appendRow([new Date(), type, message]);
  } catch (error) {
    Logger.log("Error al guardar el log: " + error.toString());
  }
}

// Función para guardar logs en una hoja de cálculo
function logToSheet(message, type) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Logs");
    if (!sheet) {
      // Si la hoja de logs no existe, créala
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet("Logs");
      sheet.appendRow(["Fecha", "Tipo", "Mensaje"]); // Encabezados
    }

    // Agregar una nueva fila con el log
    sheet.appendRow([new Date(), type, message]);
  } catch (error) {
    Logger.log("Error al guardar el log: " + error.toString());
  }
}
