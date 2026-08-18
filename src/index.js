require('dotenv').config()

const { iniciar, agregarPedido } = require('./server')
const whatsapp = require('./whatsapp')
const responses = require('./responses')
const ordenes = require('./ordenes')
const { delay, enviarMensaje, esCancelacion, truncarTexto } = require('./utils')

const puerto = process.env.PORT || 3000

async function procesarArmado(telefono, texto) {
  if (esCancelacion(texto)) {
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
        const telefono = remitente.replace('@s.whatsapp.net', '').split(':')[0]

        if (msg.message.locationMessage) {
          const { degreesLatitude, degreesLongitude } = msg.message.locationMessage
          console.log('[GPS] Ubicacion de ' + nombre + ': ' + degreesLatitude + ', ' + degreesLongitude)

          const sesion = ordenes.obtenerSesion(telefono)
          if (sesion && sesion.articulos.length > 0) {
            const resultado = ordenes.finalizarPedido(telefono, degreesLatitude, degreesLongitude)
            if (resultado) {
              await delay(800 + Math.random() * 1000)
              await enviarMensaje(sock, remitente, resultado.mensaje)

              const id = 'ped_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
              agregarPedido({
                id: id,
                nombre: nombre,
                telefono: telefono,
                mensaje: resultado.datosPedido.detalles,
                hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                ubicacion: resultado.datosPedido.ubicacion,
                estado: 'nuevo'
              })
              console.log('[DASH] Pedido completo via GPS')
            }
          } else {
            await delay(500)
            await enviarMensaje(sock, remitente, 'Ubicacion recibida 📍. Si queres hacer un pedido, decime que se te antoja.')
          }
          continue
        }

        let texto = msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          ''

        if (!texto) continue

        texto = truncarTexto(texto)

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
            const ok = await enviarMensaje(sock, remitente, respuesta, 'paso=' + (estado || '?') + ' finalizado=' + finalizado)

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
          await enviarMensaje(sock, remitente, primerMsg, 'Sesion iniciada para ' + nombre)
        } else if (result.respuesta) {
          await delay(500 + Math.random() * 1000)
          await enviarMensaje(sock, remitente, result.respuesta, 'respuesta enviada')
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
