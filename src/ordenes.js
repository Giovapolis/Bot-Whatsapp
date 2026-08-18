const { negocio } = require('./negocio')

const sesiones = new Map()

function normalizar(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function buscarItem(nombre) {
  const n = normalizar(nombre)
  const categorias = Object.keys(negocio.menu)
  for (const cat of categorias) {
    for (const item of negocio.menu[cat]) {
      if (normalizar(item.nombre) === n) return item
    }
  }
  for (const cat of categorias) {
    for (const item of negocio.menu[cat]) {
      const itemN = normalizar(item.nombre)
      if (itemN.includes(n) || n.includes(itemN)) return item
    }
  }
  return null
}

function obtenerSesion(telefono) {
  return sesiones.get(telefono)
}

function iniciar(telefono, nombre) {
  sesiones.set(telefono, {
    estado: 'ARMANDO_PEDIDO',
    nombre: nombre,
    articulos: [],
    total: 0,
    ubicacion: null,
    textoConfirmacion: ''
  })

  return [
    '*PEDIDO INICIADO*',
    '',
    'Gracias ' + nombre + '! Arma tu pedido con total confianza. 🍕',
    '',
    'Decime que se te antoja y te lo voy anotando.',
    'Cuando termines, decime "*la cuenta*".'
  ].join('\n')
}

function limpiar(telefono) {
  sesiones.delete(telefono)
}

function formatearCarrito(articulos) {
  if (!articulos || articulos.length === 0) return 'Carrito vacio.'
  return articulos.map(i => {
    let linea = '• ' + i.cantidad + 'x ' + i.nombre + ' — $' + (i.precio * i.cantidad)
    if (i.detalle) linea += '\n    ' + i.detalle
    return linea
  }).join('\n')
}

function calcularTotal(articulos) {
  return articulos.reduce((suma, a) => suma + a.precio * a.cantidad, 0)
}

function agregarArticulos(telefono, items) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return { validos: 0, invalidos: [] }

  const invalidos = []
  let validos = 0

  for (const item of items || []) {
    const ref = buscarItem(item && item.nombre)
    if (!ref) {
      invalidos.push(item && item.nombre)
      continue
    }
    const cantidad = Math.max(1, parseInt(item.cantidad, 10) || 1)
    const existente = sesion.articulos.find(a => a.nombre === ref.nombre)
    if (existente) {
      existente.cantidad += cantidad
      if (item.detalle && (!existente.detalle || existente.detalle !== item.detalle)) {
        existente.detalle = item.detalle
      }
    } else {
      sesion.articulos.push({ nombre: ref.nombre, cantidad: cantidad, precio: ref.precio, detalle: item.detalle || null })
    }
    validos++
  }

  sesion.total = calcularTotal(sesion.articulos)
  return { validos: validos, invalidos: invalidos }
}

function quitarArticulos(telefono, items) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return { quitos: 0, noEncontrados: [] }

  const noEncontrados = []
  let quitos = 0

  for (const item of items || []) {
    const ref = buscarItem(item && item.nombre)
    if (!ref) {
      noEncontrados.push(item && item.nombre)
      continue
    }
    const cantidad = Math.max(1, parseInt(item.cantidad, 10) || 1)
    const existente = sesion.articulos.find(a => a.nombre === ref.nombre)
    if (!existente) {
      noEncontrados.push(ref.nombre)
      continue
    }
    existente.cantidad -= cantidad
    if (existente.cantidad <= 0) {
      sesion.articulos = sesion.articulos.filter(a => a.nombre !== ref.nombre)
    }
    quitos++
  }

  sesion.total = calcularTotal(sesion.articulos)
  return { quitos: quitos, noEncontrados: noEncontrados }
}

function ticket(sesion) {
  const lineas = []
  lineas.push('╔═══════════════════════╗')
  lineas.push('║   ' + negocio.nombre.toUpperCase() + '  ║')
  lineas.push('╚═══════════════════════╝')
  lineas.push('')
  if (!sesion.articulos || sesion.articulos.length === 0) {
    lineas.push('  Tu carrito esta vacio.')
    lineas.push('  Agrega algo del menu para comenzar.')
  } else {
    for (const a of sesion.articulos) {
      const sub = a.precio * a.cantidad
      lineas.push('  ' + a.cantidad + 'x ' + a.nombre)
      if (a.detalle) lineas.push('    ' + a.detalle)
      lineas.push('    $' + sub)
    }
    lineas.push('')
    lineas.push('───────────────────────')
    lineas.push('  TOTAL: $' + sesion.total)
  }
  lineas.push('───────────────────────')
  return lineas.join('\n')
}

function corregirTotal(texto, totalReal) {
  if (!texto) return texto
  const matches = texto.match(/\$(\d+)/g)
  if (!matches || !totalReal) return texto
  const ultimo = parseInt(matches[matches.length - 1].replace('$', ''), 10)
  if (ultimo === totalReal) return texto
  return texto + '\n\n*Total real: $' + totalReal + '*'
}

function resumenConTotal(telefono, resumenIA) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return resumenIA
  return corregirTotal(resumenIA, sesion.total)
}

function finalizarArmado(telefono) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return null
  sesion.estado = 'ESPERANDO_UBICACION'
  return [
    'Perfecto, ya tengo tu pedido completo. 📝',
    '',
    'Un ultimo paso: compartime tu *ubicacion* por WhatsApp para que el repartidor llegue mas rapido. 📍',
    '',
    'Toca el clip 📎 > Ubicacion > Enviar ubicacion actual',
    '',
    'O responde "No" si prefieres dar la direccion despues.'
  ].join('\n')
}

function resumenConfirmar(sesion) {
  return [
    'Resumen de tu pedido:',
    '',
    formatearCarrito(sesion.articulos),
    '💵 *Total: $' + sesion.total + '*',
    '📍 ' + (sesion.ubicacion?.direccion || 'Pendiente'),
    '',
    '¿Confirmamos? Responde *SI* o *NO*'
  ].join('\n')
}

function guardarUbicacion(telefono, lat, lng) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return null
  sesion.ubicacion = { lat: lat, lng: lng, direccion: lat + ', ' + lng }
  sesion.estado = 'ESPERANDO_CONFIRMAR'

  return 'Ubicacion recibida! 📍\n\n' + resumenConfirmar(sesion)
}

function finalizarPedido(telefono, lat, lng) {
  const sesion = sesiones.get(telefono)
  if (!sesion || !sesion.articulos.length) return null

  sesion.ubicacion = { lat: lat, lng: lng, direccion: lat + ', ' + lng }
  sesion.estado = 'CONFIRMADO'

  const datosPedido = {
    detalles: formatearDatosPedido(sesion),
    total: sesion.total,
    ubicacion: sesion.ubicacion
  }

  const mensaje = [
    '✅ *PEDIDO CONFIRMADO*',
    '',
    formatearCarrito(sesion.articulos),
    '💵 *Total: $' + sesion.total + '*',
    '📍 ' + sesion.ubicacion.direccion,
    '',
    'En breve te contactamos para coordinar la entrega.',
    'Gracias ' + sesion.nombre + '! 🙌'
  ].join('\n')

  limpiar(telefono)
  return { mensaje: mensaje, datosPedido: datosPedido }
}

function formatearDatosPedido(sesion) {
  const lineas = []
  lineas.push(formatearCarrito(sesion.articulos))
  lineas.push('Total: $' + sesion.total)
  if (sesion.ubicacion) {
    lineas.push('Ubicacion: ' + (sesion.ubicacion.direccion || (sesion.ubicacion.lat + ', ' + sesion.ubicacion.lng)))
  }
  return lineas.join('\n')
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
    case 'ESPERANDO_UBICACION':
      if (t === 'no' || t === 'no puedo' || t === 'despues' || t === 'sin ubicacion') {
        sesion.ubicacion = { lat: null, lng: null, direccion: 'Sin especificar' }
        sesion.estado = 'ESPERANDO_CONFIRMAR'
        resultado.respuesta = 'Ok, lo coordinamos despues.\n\n' + resumenConfirmar(sesion)
      } else if (texto.toLowerCase().startsWith('http') || texto.includes(',')) {
        sesion.ubicacion = { lat: null, lng: null, direccion: texto }
        sesion.estado = 'ESPERANDO_CONFIRMAR'
        resultado.respuesta = 'Anotado tu envio.\n\n' + resumenConfirmar(sesion)
      } else {
        resultado.respuesta = [
          'Para compartir ubicacion:',
          '1. Toca el clip 📎',
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
          detalles: formatearDatosPedido(sesion),
          total: sesion.total,
          ubicacion: sesion.ubicacion
        }
        resultado.respuesta = [
          '✅ *PEDIDO CONFIRMADO*',
          '',
          formatearCarrito(sesion.articulos),
          '💵 *Total: $' + sesion.total + '*',
          '📍 ' + (sesion.ubicacion?.direccion || 'Pendiente'),
          '',
          'En breve te contactamos para coordinar la entrega.',
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

module.exports = {
  iniciar,
  obtenerSesion,
  procesar,
  guardarUbicacion,
  finalizarPedido,
  limpiar,
  agregarArticulos,
  quitarArticulos,
  finalizarArmado,
  resumenConTotal,
  formatearCarrito,
  ticket
}