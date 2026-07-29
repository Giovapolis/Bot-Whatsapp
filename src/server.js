const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')
const { login, authMiddleware, authSocket } = require('./auth')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'public')))

app.post('/api/login', (req, res) => {
  const { user, pass } = req.body
  const token = login(user, pass)
  if (!token) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
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

function iniciar(puerto) {
  server.listen(puerto, () => {
    console.log(`Dashboard: http://localhost:${puerto}`)
  })
  return io
}

module.exports = { iniciar }
