const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('baileys')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')
const { delay } = require('./utils')

const MAX_SESIONES = parseInt(process.env.MAX_SESIONES || '5', 10)
const AUTH_ROOT = path.join(__dirname, '..', 'auth')
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'sesiones.json')

const sessions = new Map()
let ioRef = null
let messageHandler = null

function authDir(id) {
  return path.join(AUTH_ROOT, id)
}

function loadCatalog() {
  try {
    if (!fs.existsSync(CATALOG_PATH)) return []
    const raw = fs.readFileSync(CATALOG_PATH, 'utf8')
    const list = JSON.parse(raw || '[]')
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.error('[ERR] Al cargar catalogo de sesiones: ' + err.message)
    return []
  }
}

function saveCatalog() {
  try {
    const dir = path.dirname(CATALOG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const list = [...sessions.values()].map(s => ({ id: s.id, etiqueta: s.etiqueta, telefono: s.estado.telefono || null }))
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(list, null, 2), 'utf8')
  } catch (err) {
    console.error('[ERR] Al guardar catalogo de sesiones: ' + err.message)
  }
}

function migrateLegacyAuth() {
  try {
    const legacyCreds = path.join(AUTH_ROOT, 'creds.json')
    const defaultDir = authDir('default')
    if (fs.existsSync(legacyCreds) && !fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true })
      for (const entry of fs.readdirSync(AUTH_ROOT)) {
        const full = path.join(AUTH_ROOT, entry)
        if (full === defaultDir) continue
        if (fs.statSync(full).isFile()) {
          fs.renameSync(full, path.join(defaultDir, entry))
        }
      }
      console.log('[WA] Auth migrada a sesion default')
    }
  } catch (err) {
    console.error('[ERR] Al migrar auth: ' + err.message)
  }
}

function publicState(s) {
  return {
    id: s.id,
    etiqueta: s.etiqueta,
    conectado: s.estado.conectado,
    telefono: s.estado.telefono || null,
    tieneQR: !!s.estado.qrDataUri,
    qrDataUri: s.estado.qrDataUri,
    qrFecha: s.estado.qrFecha || null
  }
}

function listar() {
  return [...sessions.values()].map(publicState)
}

function broadcastList() {
  if (ioRef) ioRef.emit('sesiones_actuales', listar())
}

function cleanDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  } catch (err) {
    console.error('[ERR] No se pudo limpiar ' + dir + ': ' + err.message)
  }
}

function makeId() {
  return 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
}

async function connectSession(s) {
  const { state, saveCreds } = await useMultiFileAuthState(s.authPath)
  if (s.sock) {
    try { s.sock.end(undefined) } catch (e) {}
    s.sock = null
  }
  s.sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    defaultQueryTimeoutMs: 300000,
    connectTimeoutMs: 300000
  })
  s.sock.ev.on('creds.update', saveCreds)
  s.sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('[QR] Codigo QR generado sesion ' + s.id + ' - escanea con WhatsApp')
      s.estado.qrDataUri = await QRCode.toDataURL(qr, { width: 400, margin: 2 })
      s.estado.qrFecha = Date.now()
      s.estado.conectado = false
      s.fallos = 0
      s.reintentos = 0
      if (ioRef) ioRef.emit('qr', { sessionId: s.id, qrDataUri: s.estado.qrDataUri, qrFecha: s.estado.qrFecha })
      broadcastList()
    }
    if (connection === 'open') {
      const numero = s.sock.user && s.sock.user.id ? String(s.sock.user.id).split(':')[0].split('@')[0].replace(/[^0-9]/g, '') : null
      console.log('[OK] WhatsApp conectado sesion ' + s.id + (numero ? ' (' + numero + ')' : ''))
      s.estado.conectado = true
      s.estado.telefono = numero
      s.estado.qrDataUri = null
      s.estado.qrFecha = null
      s.fallos = 0
      s.reintentos = 0
      saveCatalog()
      if (ioRef) ioRef.emit('conn_ready', { sessionId: s.id, telefono: numero })
      broadcastList()
      if (messageHandler) messageHandler(s.sock, s.id)
    }
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      const errorMsg = lastDisconnect?.error?.message
      const isLoggedOut = reason === DisconnectReason.loggedOut
      const isTimeout = errorMsg === 'Timed Out'
      const isConnectionFailure = errorMsg === 'Connection Failure'
      s.reintentos++
      if (s.reintentos > 10) {
        console.error('[WA] Sesion ' + s.id + ' maximo de reconexiones, limpiando...')
        s.estado.conectado = false
        s.estado.qrDataUri = null
        s.estado.qrFecha = null
        if (ioRef) ioRef.emit('conn_error', { sessionId: s.id, error: 'Sesion agotada. Limpiando...' })
        broadcastList()
        cleanDir(s.authPath)
        s.reintentos = 0
        await delay(2000)
        connectSession(s)
        return
      }
      if (isConnectionFailure) {
        s.fallos++
        console.error('[ERR] Sesion ' + s.id + ' Connection Failure (' + s.fallos + '/3)')
        if (s.fallos >= 3) {
          console.error('[WA] Sesion ' + s.id + ' demasiados fallos, limpiando...')
          s.estado.conectado = false
          s.estado.qrDataUri = null
          s.estado.qrFecha = null
          if (ioRef) ioRef.emit('conn_error', { sessionId: s.id, error: 'Sesion corrupta. Limpiando y generando QR nuevo...' })
          broadcastList()
          cleanDir(s.authPath)
          s.fallos = 0
          s.reintentos = 0
          await delay(2000)
          connectSession(s)
        } else {
          if (ioRef) ioRef.emit('conn_error', { sessionId: s.id, error: 'Error de conexion. Reconectando...', transitorio: true })
          await delay(3000)
          connectSession(s)
        }
      } else if (isTimeout) {
        console.warn('[WA] Sesion ' + s.id + ' timeout, reconectando...')
        s.fallos++
        if (ioRef) ioRef.emit('conn_error', { sessionId: s.id, error: 'Timeout. Reconectando...', transitorio: true })
        await delay(3000)
        connectSession(s)
      } else if (!isLoggedOut) {
        if (ioRef) ioRef.emit('conn_error', { sessionId: s.id, error: 'Desconectado. Reconectando...', transitorio: true })
        await delay(3000)
        connectSession(s)
      } else {
        console.warn('[WA] Sesion ' + s.id + ' cerrada por desvinculacion. Limpiando y generando QR nuevo...')
        s.estado.conectado = false
        s.estado.telefono = null
        s.estado.qrDataUri = null
        s.estado.qrFecha = null
        if (ioRef) ioRef.emit('conn_error', { sessionId: s.id, error: 'Sesion cerrada. Escanea el QR nuevamente.' })
        broadcastList()
        cleanDir(s.authPath)
        saveCatalog()
        await delay(2000)
        connectSession(s)
      }
    }
  })
  return s.sock
}

async function iniciarTodas(io, onConnect) {
  ioRef = io
  messageHandler = onConnect
  migrateLegacyAuth()
  const catalog = loadCatalog()
  const initial = catalog.length ? catalog : [{ id: 'default', etiqueta: 'Principal', telefono: null }]
  for (const entry of initial.slice(0, MAX_SESIONES)) {
    const s = {
      id: entry.id,
      etiqueta: entry.etiqueta || entry.id,
      authPath: authDir(entry.id),
      sock: null,
      estado: { conectado: false, qrDataUri: null, qrFecha: null, telefono: entry.telefono || null },
      fallos: 0,
      reintentos: 0
    }
    sessions.set(s.id, s)
    await connectSession(s)
  }
  saveCatalog()
  return sessions
}

async function crearSesion(etiqueta) {
  if (sessions.size >= MAX_SESIONES) {
    return { error: 'Limite de ' + MAX_SESIONES + ' numeros alcanzado' }
  }
  const id = makeId()
  const s = {
    id: id,
    etiqueta: (etiqueta && String(etiqueta).trim().slice(0, 40)) || id,
    authPath: authDir(id),
    sock: null,
    estado: { conectado: false, qrDataUri: null, qrFecha: null, telefono: null },
    fallos: 0,
    reintentos: 0
  }
  sessions.set(id, s)
  saveCatalog()
  broadcastList()
  await connectSession(s)
  return { id: id }
}

async function eliminarSesion(id) {
  const s = sessions.get(id)
  if (!s) return { error: 'Sesion no encontrada' }
  if (sessions.size <= 1) {
    return { error: 'No se puede eliminar la ultima sesion' }
  }
  try { if (s.sock) s.sock.end(undefined) } catch (e) {}
  try { await s.sock.logout().catch(() => {}) } catch (e) {}
  sessions.delete(id)
  cleanDir(s.authPath)
  saveCatalog()
  broadcastList()
  return { ok: true }
}

async function desvincular(id) {
  const s = sessions.get(id)
  if (!s) return { error: 'Sesion no encontrada' }
  try { if (s.sock) s.sock.end(undefined) } catch (e) {}
  s.estado.conectado = false
  s.estado.telefono = null
  s.estado.qrDataUri = null
  s.estado.qrFecha = null
  s.fallos = 0
  s.reintentos = 0
  cleanDir(s.authPath)
  saveCatalog()
  if (ioRef) ioRef.emit('conn_error', { sessionId: id, error: 'Sesion desvinculada. Generando QR nuevo...' })
  broadcastList()
  await delay(1500)
  connectSession(s)
  return { ok: true }
}

function obtenerEstado(id) {
  if (id) {
    const s = sessions.get(id)
    return s ? publicState(s) : null
  }
  const first = [...sessions.values()][0]
  return first ? { conectado: first.estado.conectado, qrDataUri: first.estado.qrDataUri } : { conectado: false, qrDataUri: null }
}

function hayConectada() {
  for (const s of sessions.values()) {
    if (s.estado.conectado) return true
  }
  return false
}

module.exports = { iniciarTodas, crearSesion, eliminarSesion, desvincular, listar, obtenerEstado, hayConectada, MAX_SESIONES }
