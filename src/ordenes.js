const { negocio } = require('./negocio')

const sesiones = new Map()
const MAX_HISTORIAL = 6

function normalizar(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

const aliasItems = {
  'alita': 'Alitas',
  'alitas': 'Alitas',
  'costilla': 'Costillas BBQ',
  'costillas': 'Costillas BBQ',
  'costillita': 'Costillas BBQ',
  'costillitas': 'Costillas BBQ',
  'costillas bbq': 'Costillas BBQ',
  'salchipulpo': 'Salchipulpos',
  'salchipulpos': 'Salchipulpos',
  'salchi': 'Salchipulpos',
  'papa': 'Papas a la francesa',
  'papas': 'Papas a la francesa',
  'papas a la francesa': 'Papas a la francesa',
  'tutifruti': 'Refresco de Tutifruti',
  'refresco de tutifruti': 'Refresco de Tutifruti',
  'limon': 'Refresco de Limón',
  'refresco de limon': 'Refresco de Limón',
  'uva': 'Refresco de Uva',
  'refresco de uva': 'Refresco de Uva',
  'jugo de mango': 'Jugo de Mango',
  'mango': 'Jugo de Mango',
  'jugo de guayaba': 'Jugo de Guayaba',
  'guayaba': 'Jugo de Guayaba',
  'agua natural': 'Agua Natural',
  'natural': 'Agua Natural',
  'agua': 'Agua Natural'
}

function buscarItem(nombre) {
  if (!nombre) return null
  const n = normalizar(nombre)
  if (aliasItems[n]) {
    const target = aliasItems[n]
    for (const cat of Object.keys(negocio.menu)) {
      for (const item of negocio.menu[cat]) {
        if (item.nombre === target) return item
      }
    }
  }
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
    textoConfirmacion: '',
    historial: []
  })
  return [
    'Hola ' + nombre + ', con gusto te atiendo.',
    '',
    'Dime que se te antoja del menu y te lo voy anotando.',
    'Cuando termines me dices "es todo" y te paso la cuenta.'
  ].join('\n')
}

function limpiar(telefono) {
  sesiones.delete(telefono)
}

function agregarHistorial(telefono, rol, texto) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return
  if (!sesion.historial) sesion.historial = []
  sesion.historial.push({ rol: rol, texto: String(texto).slice(0, 300) })
  if (sesion.historial.length > MAX_HISTORIAL) {
    sesion.historial = sesion.historial.slice(-MAX_HISTORIAL)
  }
}

function obtenerHistorialTexto(telefono) {
  const sesion = sesiones.get(telefono)
  if (!sesion || !sesion.historial || sesion.historial.length === 0) return 'Sin historial previo.'
  return sesion.historial.map(h => (h.rol === 'cliente' ? 'Cliente: ' : 'Mesero: ') + h.texto).join('\n')
}

function formatearCarrito(articulos) {
  if (!articulos || articulos.length === 0) return 'Carrito vacio.'
  return articulos.map(i => {
    let linea = '• ' + i.cantidad + 'x ' + i.nombre
    if (i.detalle) linea += ' (' + i.detalle + ')'
    linea += ' — $' + (i.precio * i.cantidad)
    return linea
  }).join('\n')
}

function calcularTotal(articulos) {
  return articulos.reduce((suma, a) => suma + a.precio * a.cantidad, 0)
}

function agregarArticulos(telefono, items) {
  const sesion = sesiones.get(telefono)
  if (!sesion) {
    console.log('[ORDENES] agregarArticulos: sesion null para', telefono)
    return { validos: 0, invalidos: [] }
  }
  console.log('[ORDENES] agregarArticulos:', telefono, 'items:', JSON.stringify(items))
  const invalidos = []
  let validos = 0
  let actualizados = 0
  for (const item of items || []) {
    const nombreItem = (typeof item === 'string' ? item : null)
      || (item && (item.nombre || item.name || item.item || item.product || item.plato))
    const ref = buscarItem(nombreItem)
    if (!ref) {
      console.log('[ORDENES] Item invalido:', JSON.stringify(item))
      invalidos.push(nombreItem || JSON.stringify(item))
      continue
    }
    const cantidad = Math.max(1, parseInt(item.cantidad, 10) || 1)
    const detalleNuevo = item.detalle ? String(item.detalle).trim() : null
    const existente = sesion.articulos.find(a => a.nombre === ref.nombre)
    if (existente) {
      if (detalleNuevo && existente.detalle !== detalleNuevo) {
        if (!existente.detalle || (existente.cantidad === 1 && cantidad === 1)) {
          existente.detalle = detalleNuevo
          actualizados++
        } else {
          existente.cantidad += cantidad
          existente.detalle = detalleNuevo
        }
      } else {
        existente.cantidad += cantidad
      }
    } else {
      sesion.articulos.push({ nombre: ref.nombre, cantidad: cantidad, precio: ref.precio, detalle: detalleNuevo })
    }
    validos++
  }
  sesion.total = calcularTotal(sesion.articulos)
  console.log('[ORDENES] resultado:', validos, 'validos,', invalidos.length, 'invalidos,', actualizados, 'actualizados. Total:', sesion.total, 'Articulos:', sesion.articulos.length)
  return { validos: validos, invalidos: invalidos, actualizados: actualizados }
}

function quitarArticulos(telefono, items) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return { quitos: 0, noEncontrados: [] }
  const noEncontrados = []
  let quitos = 0
  for (const item of items || []) {
    const nombreItem = (typeof item === 'string' ? item : null) || (item && (item.nombre || item.name || item.item))
    const ref = buscarItem(nombreItem)
    if (!ref) {
      noEncontrados.push(nombreItem)
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
  lineas.push(negocio.nombre)
  lineas.push('Tu pedido:')
  lineas.push('')
  if (!sesion.articulos || sesion.articulos.length === 0) {
    lineas.push('Tu carrito esta vacio.')
    lineas.push('Dime que se te antoja del menu para empezar.')
  } else {
    for (const a of sesion.articulos) {
      const sub = a.precio * a.cantidad
      let linea = a.cantidad + 'x ' + a.nombre
      if (a.detalle) linea += ' (' + a.detalle + ')'
      linea += ' - $' + sub
      lineas.push(linea)
    }
    lineas.push('')
    lineas.push('Total: $' + sesion.total)
  }
  return lineas.join('\n')
}

function resumenLinea(sesion) {
  if (!sesion.articulos || sesion.articulos.length === 0) return ''
  const partes = sesion.articulos.map(a => {
    let p = a.cantidad + 'x ' + a.nombre
    if (a.detalle) p += ' (' + a.detalle + ')'
    return p
  })
  return 'Llevas: ' + partes.join(', ') + '. Total $' + sesion.total + '.'
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
    'Perfecto, ya tengo tu pedido completo.',
    '',
    ticket(sesion),
    '',
    'Para entregartelo rapido, me compartes tu ubicacion por WhatsApp?',
    'Toca el clip > Ubicacion > Enviar ubicacion actual.',
    '',
    'O escribeme tu direccion si prefieres.'
  ].join('\n')
}

function resumenConfirmar(sesion) {
  return [
    'Te confirmo tu pedido:',
    '',
    ticket(sesion),
    'Entrega en: ' + (sesion.ubicacion?.direccion || 'Pendiente'),
    '',
    'Te lo confirmo? Responde SI para enviarlo a cocina o NO si quieres hacer un cambio.'
  ].join('\n')
}

function guardarUbicacion(telefono, lat, lng) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return null
  sesion.ubicacion = { lat: lat, lng: lng, direccion: lat + ', ' + lng }
  sesion.estado = 'ESPERANDO_CONFIRMAR'
  return 'Gracias, ya recibi tu ubicacion.\n\n' + resumenConfirmar(sesion)
}

function finalizarPedido(telefono, lat, lng) {
  const sesion = sesiones.get(telefono)
  if (!sesion) {
    console.log('[ORDENES] finalizarPedido: sesion null para', telefono)
    return null
  }
  if (!sesion.articulos || sesion.articulos.length === 0) {
    console.log('[ORDENES] finalizarPedido: sin articulos para', telefono)
    return null
  }
  console.log('[ORDENES] finalizarPedido:', telefono, 'articulos:', sesion.articulos.length, 'total:', sesion.total)
  sesion.ubicacion = { lat: lat, lng: lng, direccion: lat + ', ' + lng }
  sesion.estado = 'CONFIRMADO'
  const datosPedido = {
    detalles: formatearDatosPedido(sesion),
    total: sesion.total,
    ubicacion: sesion.ubicacion
  }
  const mensaje = [
    'Listo ' + sesion.nombre + ', tu pedido ya esta confirmado.',
    '',
    ticket(sesion),
    'Entrega en: ' + sesion.ubicacion.direccion,
    '',
    'Tiempo estimado de 30 a 45 minutos. Te avisamos cuando vaya en camino. Gracias por tu compra.'
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

function esConfirmacion(t) {
  const texto = normalizar(t)
  if (/^(si|sip|simon|simona|claro|va|vale|dale|ok|okey|de una|adelante|confirmo|confirmado|esta bien|estoy de acuerdo|por favor si|si por favor|si esta bien|si mandalo|mandalo|envialo)\b/.test(texto)) return true
  if (/\b(si|simon|claro|va|dale|ok|confirmo|confirmado)\b/.test(texto) && texto.length < 30) return true
  return false
}

function esNegacion(t) {
  const texto = normalizar(t)
  if (/^(no|cancelalo|mejor no|asi no|no esta bien|no quiero)\b/.test(texto)) return true
  return false
}

function esPregunta(t) {
  const texto = String(t).trim()
  if (texto.includes('?')) return true
  if (/^(cuanto|cual|que|donde|cuando|tardan|tienen|manejan|hacen|pueden|a que hora)/i.test(texto)) return true
  return false
}

function procesar(telefono, texto) {
  const sesion = sesiones.get(telefono)
  if (!sesion) return null
  const resultado = { respuesta: null, finalizado: false, datosPedido: null, estado: sesion.estado }
  const t = texto.toLowerCase().trim()
  if (t === 'cancelar' || t === 'cancel' || t === 'salir' || t === 'nunca' || t === 'mejor no' || t === 'no quiero') {
    limpiar(telefono)
    resultado.respuesta = 'Sin problema, aqui estoy cuando se te antoje algo. Gracias por escribirnos.'
    return resultado
  }
  switch (sesion.estado) {
    case 'ESPERANDO_UBICACION':
      if (t === 'no' || t === 'no puedo' || t === 'despues' || t === 'sin ubicacion' || t === 'sin ubicación' || t === 'luego te la paso') {
        sesion.ubicacion = { lat: null, lng: null, direccion: 'Sin especificar' }
        sesion.estado = 'ESPERANDO_CONFIRMAR'
        resultado.respuesta = 'Claro, lo coordinamos al entregar.\n\n' + resumenConfirmar(sesion)
      } else if (texto.toLowerCase().startsWith('http') || texto.includes(',')) {
        sesion.ubicacion = { lat: null, lng: null, direccion: texto }
        sesion.estado = 'ESPERANDO_CONFIRMAR'
        resultado.respuesta = 'Perfecto, ya anote tu direccion.\n\n' + resumenConfirmar(sesion)
      } else if (texto.trim().length >= 8 && !esPregunta(texto)) {
        sesion.ubicacion = { lat: null, lng: null, direccion: texto }
        sesion.estado = 'ESPERANDO_CONFIRMAR'
        resultado.respuesta = 'Perfecto, ya anote tu direccion.\n\n' + resumenConfirmar(sesion)
      } else {
        resultado.respuesta = [
          'Me ayudas compartiendome tu ubicacion?',
          'Toca el clip > Ubicacion > Enviar ubicacion actual.',
          '',
          'O escribeme tu calle, numero y colonia y la anoto.'
        ].join('\n')
      }
      break
    case 'ESPERANDO_CONFIRMAR':
      if (esConfirmacion(texto)) {
        resultado.estado = 'CONFIRMADO'
        resultado.finalizado = true
        resultado.datosPedido = {
          detalles: formatearDatosPedido(sesion),
          total: sesion.total,
          ubicacion: sesion.ubicacion
        }
        resultado.respuesta = [
          'Listo ' + sesion.nombre + ', tu pedido ya esta confirmado.',
          '',
          ticket(sesion),
          'Entrega en: ' + (sesion.ubicacion?.direccion || 'Pendiente'),
          '',
          'Tiempo estimado de 30 a 45 minutos. Te avisamos cuando vaya en camino. Gracias por tu compra.'
        ].join('\n')
        limpiar(telefono)
      } else if (esNegacion(texto)) {
        limpiar(telefono)
        resultado.respuesta = [
          'Claro, lo dejamos pausado sin problema.',
          'Cuando gustes retomamos tu pedido o me pides el menu.'
        ].join('\n')
      } else {
        resultado.respuesta = [
          'Con gusto te ayudo.',
          '',
          resumenConfirmar(sesion)
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
  resumenLinea,
  agregarHistorial,
  obtenerHistorialTexto,
  ticket
}
