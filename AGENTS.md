# Bot WhatsApp — Agentes AI

## Stack
- Node.js v24 (CommonJS)
- baileys (WhatsApp WebSocket)
- Express + Socket.IO (Dashboard)
- SQLite (dev) / PostgreSQL (prod Docker)

## Proyecto
Bot de pedidos para restaurante "Comida Rica": responde automaticamente por WhatsApp, flujo interactivo de pedido con confirmacion y ubicacion GPS. Dashboard web en tiempo real con login.

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
- `index.js` — Orquestador (bienvenida, messages.upsert, locationMessage)
- `whatsapp.js` — Conexion Baileys + QR + estado global
- `responses.js` — Keywords con emojis, saludos, deteccion de pedido
- `ordenes.js` — Maquina de estados del flujo de pedido
- `server.js` — Express + Socket.IO + login API
- `auth.js` — Sesiones con tokens UUID
- `public/dashboard.html` — Dashboard purple/negro con sidebar, QR, pedidos y mapa
- `database.js` — (Fase 2) Capa BD abstracta

## Convenciones
- JavaScript CommonJS (require/module.exports)
- Sin comentarios en codigo
- Variables en ingles, mensajes de usuario en espanol
- Logs sin emojis (ASCII tags: [OK], [MSG], [ERR], [QR])

## Produccion
```bash
docker build -t bot-whatsapp .
docker run -d --name bot-wp -p 8080:8080 --env-file .env bot-whatsapp
```
