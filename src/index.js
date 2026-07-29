require('dotenv').config()

const { iniciar, agregarPedido } = require('./server')
const whatsapp = require('./whatsapp')
const responses = require('./responses')
const ordenes = require('./ordenes')

const puerto = process.env.PORT || 3000
const contactosSaludados = new Set()

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const io = iniciar(puerto)
  const sock = await whatsapp.iniciar(io)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      if (!msg.message) continue

      const remitente = msg.key.remoteJid
      if (remitente.includes('@g.us')) continue

      const nombre = msg.pushName || 'Desconocido'
      const telefono = remitente.replace('@s.whatsapp.net', '')

      if (msg.message.locationMessage) {
        const { degreesLatitude, degreesLongitude } = msg.message.locationMessage
        console.log('[GPS] Ubicacion de ' + nombre + ': ' + degreesLatitude + ', ' + degreesLongitude)

        const sesion = ordenes.obtenerSesion(telefono)
        if (sesion) {
          const respuesta = ordenes.guardarUbicacion(telefono, degreesLatitude, degreesLongitude)
          if (respuesta) {
            await delay(800 + Math.random() * 1000)
            await sock.sendMessage(remitente, { text: respuesta })
          }
        } else {
          await delay(500)
          await sock.sendMessage(remitente, { text: 'Ubicacion recibida 📍. Si queres hacer un pedido, decime que se te antoja.' })
        }
        continue
      }

      const texto = msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        ''

      if (!texto) continue

      console.log('[MSG] ' + nombre + ': "' + texto + '"')

      const sesion = ordenes.obtenerSesion(telefono)

      if (sesion) {
        const result = ordenes.procesar(telefono, texto)
        if (result && result.respuesta) {
          await delay(800 + Math.random() * 1200)
          try {
            await sock.sendMessage(remitente, { text: result.respuesta })
            console.log('[OK] paso=' + (result.estado || '?') + ' finalizado=' + result.finalizado)
          } catch (err) {
            console.error('[ERR] ' + err.message)
          }

            if (result.finalizado && result.datosPedido) {
            const id = 'ped_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
            const datos = result.datosPedido
            let mensajeCompleto = 'Pedido: ' + datos.detalles + '\nBebida: ' + datos.bebidas
            if (datos.ubicacion) {
              mensajeCompleto += '\nUbicacion: ' + (datos.ubicacion.direccion || (datos.ubicacion.lat + ', ' + datos.ubicacion.lng))
            }
            agregarPedido({
              id: id,
              nombre: nombre,
              telefono: telefono,
              mensaje: mensajeCompleto,
              hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
              ubicacion: datos.ubicacion,
              estado: 'nuevo'
            })
            console.log('[DASH] Pedido completo')
          }
        }
        continue
      }

      const result = responses.procesar(texto)

      if (!contactosSaludados.has(telefono)) {
        contactosSaludados.add(telefono)
        if (!result.esKeyword) {
          const saludo = [
            'Hola ' + nombre + '! Bienvenido a *Comida Rica* 🍕🌮',
            '',
            'Preguntame por:',
            '- menu, horario',
            '',
            'O hace tu pedido directo! 📦',
            '',
            '¿En que puedo ayudarte?'
          ].join('\n')
          await delay(500)
          await sock.sendMessage(remitente, { text: saludo })
          console.log('[OK] Bienvenida a ' + nombre)
          continue
        }
      }

      if (result.esSaludo) {
        continue
      }

      if (result.esPedido) {
        const primerMsg = ordenes.iniciar(telefono, nombre, texto)
        await delay(800 + Math.random() * 1200)
        try {
          await sock.sendMessage(remitente, { text: primerMsg })
          console.log('[OK] Sesion iniciada para ' + nombre)
        } catch (err) {
          console.error('[ERR] ' + err.message)
        }
      } else if (result.respuesta) {
        await delay(500 + Math.random() * 1000)
        try {
          await sock.sendMessage(remitente, { text: result.respuesta })
          console.log('[OK] respuesta enviada')
        } catch (err) {
          console.error('[ERR] ' + err.message)
        }
      }
    }
  })
}

main().catch(err => {
  console.error('[ERR] ' + err.message)
  process.exit(1)
})
