const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('baileys')
const QRCode = require('qrcode')

let sock = null
let estado = { conectado: false, qrDataUri: null }

async function iniciar(io) {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  sock = makeWASocket({
    auth: state,
    browser: Browsers.windows('Desktop'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    defaultQueryTimeoutMs: 120000
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
      const shouldReconnect = reason !== DisconnectReason.loggedOut
      if (shouldReconnect) {
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
