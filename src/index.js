require('dotenv').config()

const { iniciar, agregarPedido } = require('./server')
const sesiones = require('./sesiones')
const responses = require('./responses')
const ordenes = require('./ordenes')
const { delay, enviarMensaje, esCancelacion, truncarTexto } = require('./utils')

const puerto = process.env.PORT || 3000

function extraerTelefono(msg) {
  const alt = msg.key && msg.key.remoteJidAlt
  const raw = (alt && typeof alt === 'string' && alt.includes('@')) ? alt : msg.key.remoteJid
  const base = String(raw).split('@')[0].split(':')[0]
  return base.replace(/[^0-9]/g, '') || base
}

async function procesarArmado(telefono, texto) {
  if (esCancelacion(texto)) {
    ordenes.limpiar(telefono)
    return 'Sin problema, aqui estoy cuando se te antoje algo. Gracias por escribirnos.'
  }
  const sesion = ordenes.obtenerSesion(telefono)
  if (!sesion) return null
  ordenes.agregarHistorial(telefono, 'cliente', texto)
  const historial = ordenes.obtenerHistorialTexto(telefono)
  const r = await responses.armando(sesion.articulos, texto, historial)
  if (r.agregar && r.agregar.length) {
    const resultado = ordenes.agregarArticulos(telefono, r.agregar)
    console.log('[ARMADO] Agregados:', resultado.validos, 'Invalidos:', resultado.invalidos.length)
  }
  if (r.quitar && r.quitar.length) {
    ordenes.quitarArticulos(telefono, r.quitar)
  }
  const sesionActualizada = ordenes.obtenerSesion(telefono)
  if (!sesionActualizada) return r.resumen || 'Listo, sigo atento.'
  if (r.finalizar) {
    if (!sesionActualizada.articulos || sesionActualizada.articulos.length === 0) {
      const msgVacio = (r.resumen || 'Claro, dime que se te antoja del menu y te lo anoto con gusto.') + '\n\n' + 'Me dices que te apetece?'
      ordenes.agregarHistorial(telefono, 'bot', msgVacio)
      return msgVacio
    }
    const pideUbic = ordenes.finalizarArmado(telefono)
    const cierre = r.resumen || 'Perfecto, ya tengo tu pedido completo.'
    const full = [cierre, '', pideUbic].join('\n')
    ordenes.agregarHistorial(telefono, 'bot', full)
    return full
  }
  const linea = ordenes.resumenLinea(sesionActualizada)
  let respuesta = r.resumen || 'Con gusto te lo anoto. Me dices que mas se te antoja o me dices "es todo" para pasarte la cuenta?'
  if (linea) respuesta = respuesta + '\n\n' + linea
  ordenes.agregarHistorial(telefono, 'bot', respuesta)
  return respuesta
}

async function main() {
  const io = await iniciar(puerto)
  function configurarSocket(sock, sessionId) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (msg.key.fromMe) continue
        if (!msg.message) continue
        const remitente = msg.key.remoteJid
        if (remitente.includes('@g.us')) continue
        const nombre = msg.pushName || 'Desconocido'
        const telefono = extraerTelefono(msg)
        if (msg.message.locationMessage) {
          const { degreesLatitude, degreesLongitude } = msg.message.locationMessage
          console.log('[GPS] Ubicacion de ' + nombre + ' (' + telefono + '): ' + degreesLatitude + ', ' + degreesLongitude)
          const sesion = ordenes.obtenerSesion(telefono)
          if (sesion && sesion.articulos.length > 0) {
            ordenes.agregarHistorial(telefono, 'cliente', '[ubicacion GPS]')
            const resumen = ordenes.guardarUbicacion(telefono, degreesLatitude, degreesLongitude)
            if (resumen) {
              ordenes.agregarHistorial(telefono, 'bot', resumen)
              await delay(800 + Math.random() * 1000)
              await enviarMensaje(sock, remitente, resumen)
            }
          } else if (sesion && sesion.articulos.length === 0) {
            await delay(500)
            const msgVacio = 'Todavia no tengo tu pedido. Dime que se te antoja del menu y despues me compartes tu ubicacion.'
            ordenes.agregarHistorial(telefono, 'bot', msgVacio)
            await enviarMensaje(sock, remitente, msgVacio)
          } else {
            await delay(500)
            await enviarMensaje(sock, remitente, 'Ubicacion recibida. Si quieres hacer un pedido, dime que se te antoja del menu.')
          }
          continue
        }
        let texto = msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          ''
        if (!texto) continue
        texto = truncarTexto(texto)
        console.log('[MSG] ' + nombre + ' [' + sessionId + ']: "' + texto + '"')
        const sesion = ordenes.obtenerSesion(telefono)
        if (sesion) {
          let respuesta = null
          let finalizado = false
          let datosPedido = null
          let estado = sesion.estado
          if (sesion.estado === 'ARMANDO_PEDIDO') {
            respuesta = await procesarArmado(telefono, texto)
          } else {
            ordenes.agregarHistorial(telefono, 'cliente', texto)
            const result = ordenes.procesar(telefono, texto)
            respuesta = result.respuesta
            finalizado = result.finalizado
            datosPedido = result.datosPedido
            estado = result.estado
            if (respuesta) ordenes.agregarHistorial(telefono, 'bot', respuesta)
          }
          if (respuesta) {
            await delay(800 + Math.random() * 1200)
            await enviarMensaje(sock, remitente, respuesta, 'paso=' + (estado || '?') + ' finalizado=' + finalizado)
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
              console.log('[DASH] Pedido guardado:', id)
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
        } else {
          const extra = await responses.extraerItems(texto)
          if (extra.tienePedido && extra.items.length) {
            ordenes.iniciar(telefono, nombre)
            ordenes.agregarHistorial(telefono, 'cliente', texto)
            const historial = ordenes.obtenerHistorialTexto(telefono)
            const r = await responses.armando([], texto, historial)
            const items = r.agregar && r.agregar.length ? r.agregar : extra.items
            ordenes.agregarArticulos(telefono, items)
            const sesionNueva = ordenes.obtenerSesion(telefono)
            const linea = ordenes.resumenLinea(sesionNueva)
            let primer = r.resumen || 'Con gusto te lo anoto.'
            if (linea) primer = primer + '\n\n' + linea
            ordenes.agregarHistorial(telefono, 'bot', primer)
            await delay(800 + Math.random() * 1200)
            await enviarMensaje(sock, remitente, primer, 'Sesion iniciada por extraccion para ' + nombre)
          } else if (result.respuesta) {
            await delay(500 + Math.random() * 1000)
            await enviarMensaje(sock, remitente, result.respuesta, 'respuesta enviada')
          }
        }
      }
    })
  }
  await sesiones.iniciarTodas(io, configurarSocket)
}

main().catch(err => {
  console.error('[ERR] ' + err.message)
  process.exit(1)
})
