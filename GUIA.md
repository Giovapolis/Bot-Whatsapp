# Guia de Mantenimiento — Bot WhatsApp "Wings Doble R"

---

## 1. Cambiar el nombre del restaurante

### Archivos a modificar
- `src/negocio.js` lineas 2-3
- `public/dashboard.html` lineas 6, 190, 211

### negocio.js
```js
// Cambiar estos valores
nombre: 'Tu Restaurante',
tipo: 'Restaurante de comida mexicana',
```

### dashboard.html (4 lugares)
- Linea 6: `<title>Wings Doble R — Dashboard</title>`
- Linea 190: `<div class="login-title">Wings Doble R</div>`
- Linea 211: `<h2>Wings Doble R</h2>`
- Emoji logo: Linea 189 y Linea 210 (cambiar `🍗` por el emoji deseado)

---

## 2. Cambiar el menú

### Archivo: `src/negocio.js`

### Estructura actual
```js
menu: {
  alitas: [ { nombre: 'Alitas', precio: 85 } ],
  costillas: [ { nombre: 'Costillas BBQ', precio: 95 } ],
  salchipulpos: [ { nombre: 'Salchipulpos', precio: 45 } ],
  acompañamientos: [
    { nombre: 'Papas a la francesa', precio: 45, nota: 'Opcional: catsup, crema, salsa picante, queso amarillo' }
  ],
  refrescos: [
    { nombre: 'Tutifruti', precio: 25 },
    { nombre: 'Limón', precio: 25 },
    { nombre: 'Uva', precio: 25 }
  ],
  jugos: [
    { nombre: 'Mango', precio: 25 },
    { nombre: 'Guayaba', precio: 25 }
  ],
  agua: [ { nombre: 'Natural', precio: 25 } ],
},
salsas: ['BBQ', 'Mango Habanero', 'Tamarindo', 'Ranch', 'Fresa Tajín', 'Chipotle Frutos Rojos'],
```

### Agregar un producto
Ejemplo: agregar "Boneless" a acompañamientos
```js
acompañamientos: [
  { nombre: 'Papas a la francesa', precio: 45, nota: 'Opcional: catsup, crema, salsa picante, queso amarillo' },
  { nombre: 'Boneless', precio: 75 }  // nuevo
],
```

Ejemplo: agregar un sabor a refrescos
```js
refrescos: [
  { nombre: 'Tutifruti', precio: 25 },
  { nombre: 'Limón', precio: 25 },
  { nombre: 'Uva', precio: 25 },
  { nombre: 'Manzana', precio: 25 }  // nuevo
],
```

### Quitar un producto
Eliminar la linea del objeto.

### Cambiar precios
Modificar el valor de `precio:`.

### Agregar una categoría nueva
1. Agregar array en `negocio.menu`
2. Actualizar `formatearMenu()` para incluirla

```js
menu: {
  // categorías existentes
  postres: [
    { nombre: 'Flan', precio: 45 },
    { nombre: 'Tres leches', precio: 55 }
  ]
}
```

Y en `formatearMenu()` agregar:
```js
txt += 'POSTRES:\n' + m.postres.map(p => '  ' + p.nombre + ' - $' + p.precio).join('\n') + '\n'
```

### Agregar una salsa
```js
salsas: ['BBQ', 'Mango Habanero', 'Tamarindo', 'Ranch', 'Fresa Tajín', 'Chipotle Frutos Rojos', 'Nueva Salsa'],
```

### Quitar una categoría
1. Eliminar el array de `negocio.menu`
2. Eliminar la línea correspondiente en `formatearMenu()`

---

## 3. Cambiar horario

### Archivo: `src/negocio.js`
```js
horario: {
  nota: 'Los horarios pueden variar en días festivos o por situaciones especiales.',
  finSemana: '06:00 pm - 11:30 pm',
},
```

---

## 4. Cambiar reglas del negocio

### Archivo: `src/negocio.js`
```js
reglas: [
  'No hay descuentos ni promociones activas actualmente',
  'Solo se acepta efectivo contra entrega',
  'No se hacen envíos fuera de la zona de cobertura',
  'Tiempo estimado de entrega: 30-45 min',
],
```

---

## 5. Cambiar contrasenas

### Archivo: `.env` en el servidor
```bash
DASHBOARD_USER=admin          # usuario del dashboard
DASHBOARD_PASS=secreto123     # contrasena del dashboard
DB_PASSWORD=segura            # contrasena de PostgreSQL
```

### Despues de cambiar .env
```bash
sudo docker compose restart app
```
No necesita rebuild, solo reinicio.

---

## 6. Cambiar colores del dashboard

### Archivo: `public/dashboard.html`

### Colores principales
| Variable | Color | Lineas |
|----------|-------|--------|
| Morado principal | `#7c3aed` | 28, 45, 78, 141, 153, 174 |
| Morado oscuro | `#6d28d9` | 28, 174, 180 |
| Negro sidebar | `#1a1a1a` | 13, 18, 58, 190 |
| Fondo claro | `#f5f3ff` | 13 |
| Texto principal | `#1a1a1a` | 13 |

### Cambiar gradiente del login (L18)
```css
background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #1a1a1a 100%);
```

### Cambiar color del sidebar (L57-58)
```css
.sidebar {
  width: 260px; background: #1a1a1a; color: #fff;
```

### Cambiar color de botones (L174)
```css
.btn-attend {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
```

---

## 7. Variables de entorno (.env)

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `8080` |
| `DASHBOARD_USER` | Usuario dashboard | `admin` |
| `DASHBOARD_PASS` | Contrasena dashboard | `secreto123` |
| `DB_PASSWORD` | Contrasena PostgreSQL | `segura` |
| `DATABASE_URL` | URL conexion BD | `postgresql://bot:segura@db:5432/bot` |
| `AI_PROVIDER` | Proveedor de IA | `gemini-vertex` |
| `AI_API_KEY` | API key (OpenRouter/OpenAI) | `sk-...` |
| `AI_MODELS` | Modelos fallback | `meta-llama/...` |
| `GEMINI_SA_FILE` | Ruta Service Account | `/app/secrets/gemini-sa.json` |
| `GEMINI_PROJECT` | ID proyecto GCP | `gen-lang-client-...` |
| `GEMINI_REGION` | Region Vertex AI | `us-central1` |
| `GEMINI_MODELS` | Modelos Gemini | `gemini-2.5-flash,gemini-flash-latest` |
| `CLEANUP_DAYS` | Dias retencion pedidos | `30` |

---

## 8. Comandos del servidor

### Desplegar cambios
```bash
cd /srv/Bot-Whatsapp
git pull origin main
sudo docker compose up -d --build
sudo docker compose logs -f app
```

### Ver logs en tiempo real
```bash
sudo docker compose logs -f app
```

### Reiniciar solo el bot
```bash
sudo docker compose restart app
```

### Ver estado de contenedores
```bash
sudo docker ps
```

### Entrar al contenedor del bot
```bash
sudo docker compose exec app sh
```

### Ver logs de Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Reiniciar Nginx
```bash
sudo systemctl restart nginx
```

### Actualizar IP de DuckDNS
```bash
sudo /opt/duckdns/duckdns.sh
```

### Verificar certificado SSL
```bash
sudo certbot certificates
```

### Renovar certificado SSL
```bash
sudo certbot renew
```

### Backup de la base de datos
```bash
sudo docker compose exec db pg_dump -U bot bot > backup_$(date +%Y%m%d).sql
```

### Restaurar backup
```bash
cat backup_20260804.sql | sudo docker compose exec -T db psql -U bot bot
```

### Verificar puertos abiertos
```bash
sudo ss -tlnp | grep -E ':(80|443|8080)\b'
```

### Verificar firewall
```bash
sudo ufw status verbose
```

---

## 9. Solucion de problemas

### El bot no responde
```bash
sudo docker compose logs -f app
sudo docker compose restart app
```

### Error de conexion a BD
```bash
sudo docker compose logs db
sudo docker compose restart db
sudo docker compose restart app
```

### SSL vencido
```bash
sudo certbot renew
sudo systemctl restart nginx
```

### DuckDNS no accesible desde fuera
```bash
# Verificar IP actual
curl -s ifconfig.me

# Actualizar DuckDNS
sudo /opt/duckdns/duckdns.sh

# Verificar resolucion
nslookup bot-gio.duckdns.org
```

### Puertos cerrados desde fuera
```bash
# Verificar UFW
sudo ufw status verbose

# Verificar Nginx escuchando
sudo ss -tlnp | grep -E ':(80|443)\b'

# Verificar Docker puertos
sudo docker ps
```

### El bot se desconecta de WhatsApp
```bash
# Verificar estado
sudo docker compose logs -f app | grep -i "conn"

# Si persiste, reiniciar
sudo docker compose restart app
```

---

## 10. Archivos importantes

| Archivo | Funcion |
|---------|---------|
| `src/negocio.js` | Menu, nombre, horario, reglas |
| `src/ai.js` | Cliente de IA (proveedores) |
| `src/responses.js` | Logica de respuestas IA |
| `src/ordenes.js` | Maquina de estados del pedido |
| `src/index.js` | Orquestador principal |
| `src/server.js` | Servidor Express + Socket.IO |
| `src/database.js` | Capa de base de datos |
| `src/auth.js` | Autenticacion del dashboard |
| `public/dashboard.html` | Interfaz del dashboard |
| `docker-compose.yml` | Configuracion Docker |
| `.env` | Variables de entorno |
| `/opt/duckdns/duckdns.sh` | Actualizacion DuckDNS |
| `/etc/nginx/sites-available/bot` | Configuracion Nginx |
