# Telegram Bot con Google Apps Script

Este es un bot de Telegram básico implementado usando Google Apps Script.

## Configuración

1. Crea un nuevo proyecto en Google Apps Script
2. Copia los archivos `.gs` en tu proyecto
3. Copia `config.example.gs` a `config.gs` y configura tus variables:
   ```javascript
   var TELEGRAM_TOKEN = "TU_TOKEN_AQUI";
   var TELEGRAM_CHAT_ID = "TU_CHAT_ID_AQUI";
   var SPREADSHEET_ID = "TU_SPREADSHEET_ID_AQUI";
   var WEBHOOK_URL = "TU_WEBHOOK_URL_AQUI";
   ```
4. Implementa el proyecto como aplicación web:
   - Ejecutar como: Tu cuenta
   - Quién tiene acceso: Cualquier persona, incluso anónima

## Estructura del Proyecto

- `config.example.gs`: Ejemplo de configuración (NO incluye datos sensibles)
- `config.gs`: Configuración real (NO subir a Git)
- `telegram.gs`: Funciones para interactuar con la API de Telegram
- `app.gs`: Endpoints principales y lógica del bot

## Uso

1. Implementa el proyecto como aplicación web
2. Configura el webhook usando la función `resetWebhook()`
3. Interactúa con el bot en Telegram usando los comandos:
   - `/start`: Iniciar el bot
   - `/ayuda`: Ver comandos disponibles
   - `/estado`: Ver estado actual

## Desarrollo

Para añadir nuevas funcionalidades:

1. Agrega nuevos comandos en `config.gs`
2. Implementa el manejo del comando en `telegram.gs`
3. Si es necesario, añade nuevos estados en `config.gs`

## Logs

Los logs se guardan en dos lugares:
1. Consola de Google Apps Script (`Logger.log()`)
2. Hoja de cálculo especificada en `LOG_SHEET_NAME`

## Seguridad

⚠️ IMPORTANTE: Nunca subas el archivo `config.gs` a Git, ya que contiene información sensible.
Usa `config.example.gs` como plantilla y mantén tus tokens y IDs seguros.
