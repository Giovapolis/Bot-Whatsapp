const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('baileys')
const QRCode = require('qrcode')

let sock = null

async function iniciar(io) {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  sock = makeWASocket({
    auth: state,
    browser: Browsers.windows('Desktop'),
    syncFullHistory: false,
    markOnlineOnConnect: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      const qrDataUri = await QRCode.toDataURL(qr, { width: 400, margin: 2 })
      io.emit('qr', { qr, qrDataUri })
    }

    if (connection === 'open') {
      io.emit('conn_ready')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = reason !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        iniciar(io)
      } else {
        io.emit('conn_error', { error: 'Sesión cerrada. Escanea el QR nuevamente.' })
      }
    }
  })

  return sock
}

function obtenerSocket() {
  return sock
}

module.exports = { iniciar, obtenerSocket }
