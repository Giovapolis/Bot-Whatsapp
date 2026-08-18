const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')
const { login, authMiddleware, authSocket } = require('./auth')
const db = require('./database')

const app = express()
const server = http.createServer(app)
const io = new Server(server)
const pedidos = []

const ESTADOS_VALIDOS = ['nuevo', 'preparando', 'entregado']

app.use(express.json({ limit: '10kb' }))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})

app.use(express.static(path.join(__dirname, '..', 'public')))

app.post('/api/login', (req, res) => {
  const { user, pass } = req.body
  if (!user || !pass) {
    return res.status(400).json({ error: 'Faltan credenciales' })
  }
  const token = login(user, pass)
  if (!token) {
    return res.status(401).json({ error: 'Credenciales invalidas' })
  }
  res.json({ token })
})

app.get('/api/check-auth', authMiddleware, (req, res) => {
  res.json({ autenticado: true })
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'))
})

io.use(authSocket)

async function agregarPedido(data) {
  pedidos.unshift(data)
  try {
    await db.guardarPedido(data)
  } catch (err) {
    console.error('[ERR] DB guardar pedido: ' + err.message)
  }
  io.emit('nuevo_pedido', data)
}

async function iniciar(puerto) {
  const guardados = await db.inicializar()
  pedidos.push(...guardados)

  server.listen(puerto, () => {
    console.log('Dashboard: http://localhost:' + puerto)
  })

  io.on('connection', (socket) => {
    const whatsapp = require('./whatsapp')
    const estado = whatsapp.obtenerEstado()
    if (estado.qrDataUri) {
      socket.emit('qr', { qrDataUri: estado.qrDataUri })
    }
    if (estado.conectado) {
      socket.emit('conn_ready')
    }

    socket.on('solicitar_qr', () => {
      const estado = whatsapp.obtenerEstado()
      if (estado.conectado) {
        socket.emit('conn_ready')
      } else if (estado.qrDataUri) {
        socket.emit('qr', { qrDataUri: estado.qrDataUri })
      }
    })

    socket.on('obtener_pedidos', () => {
      socket.emit('pedidos_actuales', pedidos)
    })

    socket.on('cambiar_estado', async ({ id, estado }) => {
      if (!ESTADOS_VALIDOS.includes(estado)) return
      const p = pedidos.find(ped => ped.id === id)
      if (p) {
        p.estado = estado
        try {
          await db.actualizarEstado(id, estado)
        } catch (err) {
          console.error('[ERR] DB actualizar estado: ' + err.message)
        }
        io.emit('pedido_actualizado', p)
      }
    })
  })

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return io
}

function shutdown() {
  console.log('[SRV] Cerrando...')
  db.cerrar().then(() => process.exit(0)).catch(() => process.exit(1))
}

module.exports = { iniciar, agregarPedido }
