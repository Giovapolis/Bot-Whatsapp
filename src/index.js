require('dotenv').config()

const server = require('./server')
const whatsapp = require('./whatsapp')
const responses = require('./responses')

const puerto = process.env.PORT || 3000

async function main() {
  const io = server.iniciar(puerto)
  const sock = await whatsapp.iniciar(io)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      if (!msg.message) continue

      const texto = msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        ''

      if (!texto) continue

      const remitente = msg.key.remoteJid
      const nombre = msg.pushName || 'Desconocido'
      const telefono = remitente.replace('@s.whatsapp.net', '')

      const result = responses.procesar(texto)

      if (result.respuesta) {
        await sock.sendMessage(remitente, { text: result.respuesta })
      }

      if (result.esPedido) {
        const id = `ped_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        io.emit('nuevo_pedido', {
          id,
          nombre,
          telefono,
          mensaje: texto,
          hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        })
      }
    }
  })
}

main().catch(err => {
  console.error('Error al iniciar:', err)
  process.exit(1)
})
