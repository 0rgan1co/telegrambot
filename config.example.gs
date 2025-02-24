// Configuración global
var TELEGRAM_TOKEN = "TU_TOKEN_AQUI";
var TELEGRAM_URL = "https://api.telegram.org/bot" + TELEGRAM_TOKEN;
var TELEGRAM_CHAT_ID = "TU_CHAT_ID_AQUI";  // ID del grupo de Telegram
var SPREADSHEET_ID = "TU_SPREADSHEET_ID_AQUI";
var WEBHOOK_URL = "TU_WEBHOOK_URL_AQUI";
var LOG_SHEET_NAME = "Logs"; // Nombre de la hoja para los logs

var EQUIPO = ["Persona1", "Persona2", "Persona3", "Persona4"];
var CATEGORIAS = [
  "Espacio de Conexión",
  "Crear o co-crear contenidos",
  "Actividades de Networking con aliados",
  "Actividades comerciales",
  "Clientes (acuerdos, gestión, feedback)",
  "Organización del equipo",
  "Difusión",
  "Sumarse"
];

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
