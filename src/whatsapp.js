const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('baileys')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')

let sock = null
let estado = { conectado: false, qrDataUri: null }
let fallosConsecutivos = 0
const MAX_FALLOS = 3

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function limpiarAuth() {
  try {
    const authPath = path.join(__dirname, '..', 'auth')
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true })
      console.log('[WA] Carpeta auth eliminada')
    }
  } catch (err) {
    console.error('[ERR] No se pudo limpiar auth: ' + err.message)
  }
}

async function iniciar(io) {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    defaultQueryTimeoutMs: 300000,
    connectTimeoutMs: 300000
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('[QR] Codigo QR generado - escanea con WhatsApp')
      estado.qrDataUri = await QRCode.toDataURL(qr, { width: 400, margin: 2 })
      estado.conectado = false
      fallosConsecutivos = 0
      io.emit('qr', { qrDataUri: estado.qrDataUri })
    }

    if (connection === 'open') {
      console.log('[OK] WhatsApp conectado')
      estado.conectado = true
      estado.qrDataUri = null
      fallosConsecutivos = 0
      io.emit('conn_ready')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      const errorMsg = lastDisconnect?.error?.message
      const isLoggedOut = reason === DisconnectReason.loggedOut
      const isTimeout = errorMsg === 'Timed Out'
      const isConnectionFailure = errorMsg === 'Connection Failure'

      if (isConnectionFailure) {
        fallosConsecutivos++
        console.error('[ERR] Connection Failure (' + fallosConsecutivos + '/' + MAX_FALLOS + ')')

        if (fallosConsecutivos >= MAX_FALLOS) {
          console.error('[WA] Demasiados fallos, limpiando sesion...')
          estado.conectado = false
          estado.qrDataUri = null
          io.emit('conn_error', { error: 'Sesion corrupta. Limpiando y generando QR nuevo...' })
          limpiarAuth()
          fallosConsecutivos = 0
          await delay(2000)
          iniciar(io)
        } else {
          io.emit('conn_error', { error: 'Error de conexion. Reconectando...' })
          await delay(3000)
          iniciar(io)
        }
      } else if (isTimeout) {
        console.warn('[WA] Timeout en init queries, reconectando...')
        fallosConsecutivos++
        await delay(3000)
        iniciar(io)
      } else if (!isLoggedOut) {
        await delay(3000)
        iniciar(io)
      } else {
        estado.conectado = false
        io.emit('conn_error', { error: 'Sesion cerrada. Escanea el QR nuevamente.' })
      }
    }
  })

  return sock
}

function obtenerEstado() {
  return estado
}

function obtenerSocket() {
  return sock
}

module.exports = { iniciar, obtenerEstado, obtenerSocket }
