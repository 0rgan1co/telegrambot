# Telegram Bot con Google Apps Script

Este es un bot de Telegram básico implementado usando Google Apps Script.

## Configuración

1. Crea un nuevo proyecto en Google Apps Script
2. Copia los archivos `.gs` en tu proyecto
3. Reemplaza `TU_TOKEN_AQUI` en `config.gs` con tu token de Telegram
4. Reemplaza `TU_SPREADSHEET_ID` en `config.gs` con el ID de tu hoja de cálculo (si vas a usar una)
5. Implementa el proyecto como aplicación web:
   - Ejecutar como: Tu cuenta
   - Quién tiene acceso: Cualquier persona, incluso anónima

## Estructura del Proyecto

- `config.gs`: Configuración global y constantes
- `telegram.gs`: Funciones para interactuar con la API de Telegram
- `app.gs`: Endpoints principales y lógica del bot

## Uso

1. Implementa el proyecto como aplicación web
2. Ejecuta la función `testBot()` para verificar que funciona
3. Interactúa con el bot en Telegram usando los comandos:
   - `/start`: Iniciar el bot
   - `/ayuda`: Ver comandos disponibles
   - `/estado`: Ver estado actual

## Desarrollo

Para añadir nuevas funcionalidades:

1. Agrega nuevos comandos en `config.gs`
2. Implementa el manejo del comando en `telegram.gs`
3. Si es necesario, añade nuevos estados en `config.gs`

## Logs server

Todos los errores y eventos importantes se registran usando `Logger.log()`. 
Puedes verlos en la consola de Google Apps Script.
