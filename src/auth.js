const crypto = require('crypto')

const sessions = new Map()
const TOKEN_TTL = 24 * 60 * 60 * 1000

const loginAttempts = new Map()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

function crearToken() {
  return crypto.randomUUID()
}

function login(user, pass) {
  const expectedUser = process.env.DASHBOARD_USER
  const expectedPass = process.env.DASHBOARD_PASS

  if (!expectedUser || !expectedPass) {
    console.error('[ERR] Faltan DASHBOARD_USER o DASHBOARD_PASS en .env')
    return null
  }

  const key = (user || '') + ':' + (pass || '')
  const attempts = loginAttempts.get(key) || { count: 0, until: 0 }

  if (attempts.until > Date.now()) {
    console.warn('[SEC] Login bloqueado: demasiados intentos para ' + (user || ''))
    return null
  }

  if (user !== expectedUser || pass !== expectedPass) {
    attempts.count++
    if (attempts.count >= MAX_ATTEMPTS) {
      attempts.until = Date.now() + LOCKOUT_MS
      console.warn('[SEC] Login bloqueado 15min: ' + (user || ''))
    }
    loginAttempts.set(key, attempts)
    return null
  }

  loginAttempts.delete(key)

  const token = crearToken()
  sessions.set(token, { user, createdAt: Date.now() })
  return token
}

function validarToken(token) {
  if (!token || !sessions.has(token)) return false
  const session = sessions.get(token)
  if (Date.now() - session.createdAt > TOKEN_TTL) {
    sessions.delete(token)
    return false
  }
  return true
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')

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

function limpiarSesiones() {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now - session.createdAt > TOKEN_TTL) {
      sessions.delete(token)
    }
  }
}

setInterval(limpiarSesiones, 60 * 60 * 1000)

module.exports = { login, validarToken, authMiddleware, authSocket }
