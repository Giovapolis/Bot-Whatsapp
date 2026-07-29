const crypto = require('crypto')

const sessions = new Map()

function crearToken() {
  return crypto.randomUUID()
}

function login(user, pass) {
  const expectedUser = process.env.DASHBOARD_USER || 'admin'
  const expectedPass = process.env.DASHBOARD_PASS || 'secreto123'

  if (user !== expectedUser || pass !== expectedPass) {
    return null
  }

  const token = crearToken()
  sessions.set(token, { user, createdAt: Date.now() })
  return token
}

function validarToken(token) {
  return sessions.has(token)
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query?.token

  if (!token || !validarToken(token)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  req.user = sessions.get(token)
  next()
}

function authSocket(socket, next) {
  const token = socket.handshake.auth?.token
  if (!token || !validarToken(token)) {
    return next(new Error('No autorizado'))
  }
  next()
}

module.exports = { login, validarToken, authMiddleware, authSocket }
