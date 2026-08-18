const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('baileys')
const QRCode = require('qrcode')

let sock = null
let estado = { conectado: false, qrDataUri: null }

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
      io.emit('qr', { qrDataUri: estado.qrDataUri })
    }

    if (connection === 'open') {
      console.log('[OK] WhatsApp conectado')
      estado.conectado = true
      estado.qrDataUri = null
      io.emit('conn_ready')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      const errorMsg = lastDisconnect?.error?.message
      const isLoggedOut = reason === DisconnectReason.loggedOut
      const isTimeout = errorMsg === 'Timed Out'
      const isConnectionFailure = errorMsg === 'Connection Failure'

      if (isConnectionFailure) {
        console.error('[ERR] Connection Failure - sesion invalida, reconectando en 5s...')
        estado.conectado = false
        io.emit('conn_error', { error: 'Sesion invalida. Reconectando...' })
        await delay(5000)
        iniciar(io)
      } else if (isTimeout) {
        console.warn('[WA] Timeout en init queries, reconectando...')
        iniciar(io)
      } else if (!isLoggedOut) {
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
