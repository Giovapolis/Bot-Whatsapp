# Bot WhatsApp — Agentes AI

## Stack
- Node.js v24 (CommonJS)
- baileys (WhatsApp WebSocket)
- Express + Socket.IO (Dashboard)
- SQLite (dev) / PostgreSQL (prod Docker)
- Google Vertex AI / OpenAI / OpenRouter (IA segun AI_PROVIDER)

## Proyecto
Bot de pedidos para restaurante "Comida Rica": responde automaticamente por WhatsApp con IA, flujo interactivo de pedido con confirmacion y ubicacion GPS. Dashboard web en tiempo real con login.

## Flujo de pedido
1. Usuario envia mensaje con intencion de pedido
2. Bot inicia sesion: "Anoto tu pedido. ¿Queres agregar algo mas?"
3. Pregunta por bebidas
4. Pide ubicacion GPS (locationMessage de WhatsApp)
5. Muestra resumen y pide confirmacion: "SI" o "NO"
6. Confirma y emite al dashboard con coordenadas

## Comandos
- `npm start` — Iniciar bot + servidor
- `npm run dev` — Desarrollo con `--watch`
- `node test-ai.js` — Probar respuestas de IA localmente

## Puertos
- Dev: 3000
- Prod: 8080

## Variables de entorno (.env)
```
PORT=3000
DASHBOARD_USER=admin
DASHBOARD_PASS=secreto123
DATABASE_URL=sqlite:./data/bot.db

# IA (OpenRouter default, gratis)
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-...
AI_MODEL=mistralai/mistral-7b-instruct:free

# Para OpenAI solo cambiar:
# AI_PROVIDER=openai
# AI_API_KEY=sk-...
# AI_MODEL=gpt-4o-mini
# AI_API_URL=https://api.openai.com/v1/chat/completions

# Para Google Vertex AI (produccion):
AI_PROVIDER=gemini-vertex
GEMINI_SA_FILE=/app/secrets/gemini-sa.json
GEMINI_PROJECT=gen-lang-client-0689613649
GEMINI_REGION=us-central1
GEMINI_MODELS=gemini-flash-latest,gemini-2.5-flash
```

## Estructura src/
- `index.js` — Orquestador (messages.upsert, locationMessage)
- `whatsapp.js` — Conexion Baileys + QR + estado global
- `responses.js` — Procesa mensajes via IA, detecta pedidos
- `ai.js` — Cliente generico de IA (Vertex AI, OpenRouter, OpenAI, Gemini)
- `negocio.js` — Datos del restaurante (menu, horario, reglas)
- `ordenes.js` — Maquina de estados del flujo de pedido
- `server.js` — Express + Socket.IO + login API + persistencia PostgreSQL
- `database.js` — Capa BD (PostgreSQL en prod, memoria en dev)
- `auth.js` — Sesiones con tokens UUID
- `public/dashboard.html` — Dashboard purple/negro con sidebar, QR, pedidos y mapa

## Convenciones
- JavaScript CommonJS (require/module.exports)
- Sin comentarios en codigo
- Variables en ingles, mensajes de usuario en espanol
- Logs sin emojis (ASCII tags: [OK], [MSG], [ERR], [QR], [GPS], [DB])

## Produccion (Docker Compose)
```bash
export DB_PASSWORD=segura
export AI_API_KEY=sk-or-v1-...
docker compose up -d
```

## Cambio rapido de proveedor de IA
1. Editar `.env` en el servidor
2. Cambiar `AI_PROVIDER` al proveedor deseado (openrouter/openai/gemini/gemini-vertex)
3. Comentar/descomentar las variables correspondientes
4. `docker compose up -d` (rebuild si se agrego dependencia)
