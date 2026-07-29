const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')
const { authMiddleware } = require('./auth')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname, '..', 'public')))

app.get('/', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'))
})

app.get('/auth-status', authMiddleware, (req, res) => {
  res.json({ autenticado: true })
})

function iniciar(puerto) {
  server.listen(puerto, () => {
    console.log(`Dashboard: http://localhost:${puerto}`)
  })
  return io
}

module.exports = { iniciar }
