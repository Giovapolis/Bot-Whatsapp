require('dotenv').config()

const { iniciar, agregarPedido } = require('./server')
const whatsapp = require('./whatsapp')
const responses = require('./responses')
const ordenes = require('./ordenes')

const puerto = process.env.PORT || 3000

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function procesarArmado(telefono, texto) {
  const t = texto.toLowerCase().trim()
  if (['cancelar', 'cancel', 'salir', 'despues', 'nunca', 'no quiero', 'mejor no'].includes(t)) {
    ordenes.limpiar(telefono)
    return 'Sin problema, cuando quieras pedir solo decime. 🙌'
  }

  const sesion = ordenes.obtenerSesion(telefono)
  if (!sesion) return null

  const r = await responses.armando(sesion.articulos, texto)

  if (r.agregar && r.agregar.length) {
    ordenes.agregarArticulos(telefono, r.agregar)
  }

  if (r.quitar && r.quitar.length) {
    ordenes.quitarArticulos(telefono, r.quitar)
  }

  const sesionActualizada = ordenes.obtenerSesion(telefono)
  const ticketActual = ordenes.ticket(sesionActualizada)

  if (r.finalizar) {
    const pideUbic = ordenes.finalizarArmado(telefono)
    const cierre = ordenes.resumenConTotal(telefono, r.resumen)
    return [cierre, '', ticketActual, '', pideUbic].join('\n')
  }

  const respuesta = ordenes.resumenConTotal(telefono, r.resumen)
  const base = respuesta || 'Voy anotando. Decime que mas queres o "*la cuenta*" cuando termines.'
  return base + '\n\n' + ticketActual
}

async function main() {
  const io = await iniciar(puerto)

  function configurarSocket(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
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
          let respuesta = null
          let finalizado = false
          let datosPedido = null
          let estado = sesion.estado

          if (sesion.estado === 'ARMANDO_PEDIDO') {
            respuesta = await procesarArmado(telefono, texto)
          } else {
            const result = ordenes.procesar(telefono, texto)
            respuesta = result.respuesta
            finalizado = result.finalizado
            datosPedido = result.datosPedido
            estado = result.estado
          }

          if (respuesta) {
            await delay(800 + Math.random() * 1200)
            try {
              await sock.sendMessage(remitente, { text: respuesta })
              console.log('[OK] paso=' + (estado || '?') + ' finalizado=' + finalizado)
            } catch (err) {
              console.error('[ERR] ' + err.message)
            }

            if (finalizado && datosPedido) {
              const id = 'ped_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
              agregarPedido({
                id: id,
                nombre: nombre,
                telefono: telefono,
                mensaje: datosPedido.detalles,
                hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                ubicacion: datosPedido.ubicacion,
                estado: 'nuevo'
              })
              console.log('[DASH] Pedido completo')
            }
          }
          continue
        }

        const result = await responses.procesar(texto)

        if (result.esPedido) {
          ordenes.iniciar(telefono, nombre)
          const primerMsg = await procesarArmado(telefono, texto)
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

  await whatsapp.iniciar(io, configurarSocket)
}

main().catch(err => {
  console.error('[ERR] ' + err.message)
  process.exit(1)
})