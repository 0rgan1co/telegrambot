// Configuración global
var TELEGRAM_TOKEN = "TU_TOKEN_AQUI"; // Reemplaza con tu token de Telegram
var TELEGRAM_API_URL = "https://api.telegram.org/bot" + TELEGRAM_TOKEN;
var SPREADSHEET_ID = "TU_SPREADSHEET_ID"; // Reemplaza con el ID de tu hoja de cálculo

// Estados de la conversación
var ESTADOS = {
  INICIAL: "INICIAL",
  ESPERANDO_COMANDO: "ESPERANDO_COMANDO",
  ESPERANDO_RESPUESTA: "ESPERANDO_RESPUESTA"
};

// Cache para estados de usuario
var CACHE_ESTADOS = {};

// Comandos disponibles
var COMANDOS = {
  START: "/start",
  AYUDA: "/ayuda",
  ESTADO: "/estado"
};
