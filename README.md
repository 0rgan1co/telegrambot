# 🤖 Telegram Bot con Google Apps Script

Bot de Telegram robusto y mantenible implementado usando Google Apps Script. Incluye sistema de logging, manejo de duplicados, y persistencia de datos.

## ✨ Características

- 📝 Logging detallado en Google Sheets
- 🔄 Manejo de updates duplicados
- 💾 Persistencia de mensajes
- ⚡ Procesamiento asíncrono
- 🔒 Manejo seguro de configuración
- 🚫 Manejo robusto de errores

## 🛠️ Configuración

### Prerequisitos

- Cuenta de Google
- Bot de Telegram (obtén uno con [@BotFather](https://t.me/botfather))
- Google Sheet para logs y mensajes

### Pasos de Instalación

1. **Crear Proyecto**
   - Crea un nuevo proyecto en [Google Apps Script](https://script.google.com)
   - Copia todos los archivos `.gs` en tu proyecto

2. **Configurar Variables**
   ```javascript
   // Copia config.example.gs a config.gs y configura:
   var TELEGRAM_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";  // De @BotFather
   var TELEGRAM_URL = "https://api.telegram.org/bot" + TELEGRAM_TOKEN;
   var WEBHOOK_URL = "https://script.google.com/.../exec";  // URL de tu deployment
   var SPREADSHEET_ID = "1234567890abcdef...";  // ID de tu Google Sheet
   var LOG_SHEET_NAME = "Logs";  // Nombre de la hoja para logs
   ```

3. **Configurar Deployment**
   - Implementa como aplicación web:
     - Ejecutar como: `Tu cuenta`
     - Quién tiene acceso: `Cualquier persona`
     - Proyecto web: `Nueva implementación`

4. **Configurar Webhook**
   - Ejecuta la función `resetWebhook()` para configurar el webhook
   - Verifica con `testBot()` que todo funciona correctamente

## 📁 Estructura del Proyecto

```
telegrambot/
├── app.gs           # Core del bot y manejo de updates
├── telegram.gs      # Funciones de la API de Telegram
├── config.gs        # Configuración real (no subir a git)
├── config.example.gs # Ejemplo de configuración
└── appsscript.json  # Manifest del proyecto
```

### Componentes Principales

- `app.gs`:
  - Manejo de webhooks
  - Procesamiento de updates
  - Sistema de logging
  - Cache de updates
  - Persistencia de mensajes

- `telegram.gs`:
  - Comandos del bot
  - Interacción con API de Telegram
  - Manejo de mensajes

## 🚀 Uso

### Comandos Disponibles

- `/start`: Iniciar el bot
- `/ayuda`: Ver comandos disponibles
- `/estado`: Ver estado actual del bot

### Funciones de Diagnóstico

- `testBot()`: Prueba completa del bot
- `getWebhookInfo()`: Ver estado del webhook
- `resetWebhook()`: Reconfigurar webhook

## 📊 Sistema de Logs

### Niveles de Log

- `INFO`: Información general
- `DEBUG`: Detalles técnicos
- `WARN`: Advertencias
- `ERROR`: Errores críticos

### Ubicación de Logs

1. **Google Sheet**
   - Timestamp
   - Nivel de log
   - Mensaje detallado

2. **Consola de Apps Script**
   - Logs técnicos
   - Stack traces
   - Errores de sistema

## 🔒 Seguridad

### Buenas Prácticas

1. **Nunca subir a git**:
   - `config.gs`
   - Tokens de acceso
   - IDs de recursos

2. **Validaciones**:
   - Todos los inputs son validados
   - Manejo de tipos de datos
   - Sanitización de logs

3. **Rate Limiting**:
   - Cache de updates
   - Límite de tamaño de cache
   - Expiración de datos

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Webhook no funciona**
   - Verifica WEBHOOK_URL
   - Ejecuta `resetWebhook()`
   - Revisa logs de error

2. **Mensajes duplicados**
   - Verifica el cache
   - Revisa los logs
   - Confirma timeout settings

3. **Errores de permisos**
   - Verifica configuración de Apps Script
   - Revisa permisos de la Sheet
   - Confirma acceso al bot

## 📝 Desarrollo

### Añadir Nuevas Funciones

1. Define el comando en `telegram.gs`
2. Implementa la lógica en `app.gs`
3. Actualiza la ayuda del bot
4. Prueba con `testBot()`

### Mejores Prácticas

- Usa el sistema de logging
- Maneja todos los errores
- Documenta los cambios
- Mantén el código limpio

## 📄 Licencia

MIT License - Siéntete libre de usar y modificar
