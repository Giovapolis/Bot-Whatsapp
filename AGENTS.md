# Bot WhatsApp — Agentes AI

## Stack
- Node.js v24 (CommonJS)
- @whiskeysockets/baileys (WhatsApp WebSocket)
- Express + Socket.IO (Dashboard)
- SQLite (dev) / PostgreSQL (prod Docker)

## Proyecto
Bot de pedidos para restaurante: responde automáticamente por WhatsApp y muestra pedidos en dashboard web en tiempo real.

## Comandos
- `npm start` — Iniciar bot + servidor
- `npm run dev` — Desarrollo con `--watch`
- `npm test` — (futuro)

## Puertos
- Dev: 3000
- Prod: 8080

## Variables de entorno (.env)
```
PORT=3000
DASHBOARD_USER=admin
DASHBOARD_PASS=secreto123
DATABASE_URL=sqlite:./data/bot.db
```

## Estructura src/
- `index.js` — Orquestador
- `whatsapp.js` — Conexión Baileys + QR
- `responses.js` — Keywords y respuestas del restaurante
- `server.js` — Express + Socket.IO
- `auth.js` — Login dashboard
- `database.js` — (Fase 2) Capa BD abstracta

## Convenciones
- JavaScript CommonJS (require/module.exports)
- Sin comentarios en código
- Variables en inglés, mensajes de usuario en español

## Producción
```bash
docker build -t bot-whatsapp .
docker run -d --name bot-wp -p 8080:8080 --env-file .env bot-whatsapp
```
