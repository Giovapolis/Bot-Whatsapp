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

app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'public')))

app.post('/api/login', (req, res) => {
  const { user, pass } = req.body
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

function agregarPedido(data) {
  pedidos.unshift(data)
  db.guardarPedido(data)
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

    socket.on('cambiar_estado', ({ id, estado }) => {
      const p = pedidos.find(ped => ped.id === id)
      if (p) {
        p.estado = estado
        db.actualizarEstado(id, estado)
        io.emit('pedido_actualizado', p)
      }
    })
  })

  return io
}

module.exports = { iniciar, agregarPedido }
