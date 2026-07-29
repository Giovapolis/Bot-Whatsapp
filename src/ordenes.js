const sesiones = new Map()

function obtenerSesion(telefono) {
  return sesiones.get(telefono)
}

function iniciar(telefono, nombre, pedidoOriginal) {
  sesiones.set(telefono, {
    estado: 'ESPERANDO_DETALLES',
    nombre: nombre,
    pedidoOriginal: pedidoOriginal,
    detalles: pedidoOriginal,
    bebidas: '',
    ubicacion: null,
    textoConfirmacion: ''
  })

  return [
    '*RECIBIDO*',
    '',
    'Gracias ' + nombre + '! Anoto tu pedido:',
    '> ' + pedidoOriginal,
    '',
    '¿Queres *agregar algo mas* o esta completo?',
    '',
    'Responde el detalle o "No" si ya esta completo.'
  ].join('\n')
}

function limpiar(telefono) {
  sesiones.delete(telefono)
}

function procesar(telefono, texto) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return null

  const resultado = { respuesta: null, finalizado: false, datosPedido: null, estado: sesion.estado }
  const t = texto.toLowerCase().trim()

  if (t === 'cancelar' || t === 'cancel' || t === 'salir' || t === 'despues' || t === 'nunca') {
    limpiar(telefono)
    resultado.respuesta = 'Sin problema, cuando quieras pedir solo decime. 🙌'
    return resultado
  }

  switch (sesion.estado) {
    case 'ESPERANDO_DETALLES':
      if (t === 'no' || t === 'no, gracias' || t === 'no, esta completo' || t === 'completo' || t === 'asi') {
        sesion.estado = 'ESPERANDO_BEBIDAS'
        resultado.respuesta = [
          'Perfecto. ¿Queres agregar alguna *bebida*?',
          '',
          '🥤 Refresco  ｜ 💧 Agua  ｜ 🧃 Jugo  ｜ 🍺 Cerveza',
          '',
          'O responde "No" si no queres.'
        ].join('\n')
      } else {
        sesion.detalles = sesion.pedidoOriginal + '. ' + texto
        sesion.estado = 'ESPERANDO_BEBIDAS'
        resultado.respuesta = [
          'Agregado ✅ Tu pedido:',
          '> ' + sesion.detalles,
          '',
          '¿Queres alguna *bebida*?',
          '',
          '🥤 Refresco  ｜ 💧 Agua  ｜ 🧃 Jugo  ｜ 🍺 Cerveza',
          '',
          'O responde "No" si no queres.'
        ].join('\n')
      }
      break

    case 'ESPERANDO_BEBIDAS':
      if (t === 'no' || t === 'no quiero' || t === 'sin' || t === 'sin bebida') {
        sesion.bebidas = 'Ninguna'
      } else {
        sesion.bebidas = texto
      }
      sesion.estado = 'ESPERANDO_UBICACION'
      resultado.respuesta = [
        'Genial! 🎯 Un paso mas.',
        '',
        'Compartime tu *ubicacion* por WhatsApp para que el repartidor llegue mas rapido. 📍',
        '',
        'Tocá el clip 📎 > Ubicacion > Enviar ubicacion actual',
        '',
        'O responde "No" si prefieres dar direccion despues.'
      ].join('\n')
      break

    case 'ESPERANDO_UBICACION':
      if (t === 'no' || t === 'no puedo' || t === 'despues') {
        sesion.ubicacion = { lat: null, lng: null, direccion: 'Sin especificar' }
        sesion.estado = 'ESPERANDO_CONFIRMAR'
        resultado.respuesta = [
          'Ok, lo coordinamos despues.',
          '',
          'Resumen de tu pedido:',
          '',
          '🍕 ' + sesion.detalles,
          '🥤 ' + sesion.bebidas,
          '',
          '¿Confirmamos? Responde *SI* o *NO*'
        ].join('\n')
      } else if (texto.toLowerCase().startsWith('http') || texto.includes(',')) {
        sesion.ubicacion = { lat: null, lng: null, direccion: texto }
        sesion.estado = 'ESPERANDO_CONFIRMAR'
        resultado.respuesta = [
          'Anotado tu envio.',
          '',
          'Resumen:',
          '',
          '🍕 ' + sesion.detalles,
          '🥤 ' + sesion.bebidas,
          '📍 ' + texto,
          '',
          '¿Confirmamos? Responde *SI* o *NO*'
        ].join('\n')
      } else {
        resultado.respuesta = [
          'Para compartir ubicacion:',
          '1. Tocá el clip 📎',
          '2. Selecciona "Ubicacion"',
          '3. Envia tu ubicacion actual',
          '',
          'O escribime tu direccion y la coordinamos.'
        ].join('\n')
      }
      break

    case 'ESPERANDO_CONFIRMAR':
      if (t === 'si' || t === 'sí' || t === 'si, confirmo' || t === 'confirmo' || t === 'dale' || t === 'ok' || t === 'esta bien') {
        resultado.estado = 'CONFIRMADO'
        resultado.finalizado = true
        resultado.datosPedido = {
          detalles: sesion.detalles,
          bebidas: sesion.bebidas,
          ubicacion: sesion.ubicacion
        }
        resultado.respuesta = [
          '✅ *PEDIDO CONFIRMADO*',
          '',
          '🍕 ' + sesion.detalles,
          '🥤 ' + sesion.bebidas,
          '📍 ' + (sesion.ubicacion?.direccion || 'Pendiente'),
          '',
          'En breve te contactamos para el total y el tiempo estimado.',
          'Gracias ' + sesion.nombre + '! 🙌'
        ].join('\n')
        limpiar(telefono)
      } else {
        limpiar(telefono)
        resultado.respuesta = [
          'Ok, decime cuando quieras pedir de nuevo. 🙌',
          'Podes consultar el *menu* o preguntar lo que necesites.'
        ].join('\n')
      }
      break
  }

  resultado.estado = sesion.estado || resultado.estado
  return resultado
}

function guardarUbicacion(telefono, lat, lng) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return null
  sesion.ubicacion = { lat, lng, direccion: lat + ', ' + lng }
  sesion.estado = 'ESPERANDO_CONFIRMAR'

  return [
    'Ubicacion recibida! 📍',
    '',
    'Resumen de tu pedido:',
    '',
    '🍕 ' + sesion.detalles,
    '🥤 ' + sesion.bebidas,
    '📍 ' + sesion.ubicacion.direccion,
    '',
    '¿Confirmamos? Responde *SI* o *NO*'
  ].join('\n')
}

module.exports = { iniciar, obtenerSesion, procesar, guardarUbicacion, limpiar }
