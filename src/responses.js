const ai = require('./ai')
const { negocio, obtenerSystemPrompt, formatearMenu } = require('./negocio')

let systemPrompt = ''

function obtenerPrompt() {
  if (!systemPrompt) {
    systemPrompt = obtenerSystemPrompt()
  }
  return systemPrompt
}

function esPedidoDetectado(respuesta) {
  if (!respuesta) return false
  const limpio = String(respuesta).trim().replace(/[*_`#>\-]/g, '').trim().toUpperCase()
  if (limpio === 'PEDIDO') return true
  if (/^PEDIDO[.!]*$/.test(limpio)) return true
  return false
}

async function procesar(texto, historialTexto) {
  const prompt = obtenerPrompt()
  const mensaje = historialTexto
    ? 'Historial reciente:\n' + historialTexto + '\n\nMensaje actual del cliente:\n"' + texto + '"'
    : texto
  const respuesta = await ai.generar(prompt, mensaje)
  if (esPedidoDetectado(respuesta)) {
    return { respuesta: 'PEDIDO', esPedido: true }
  }
  return { respuesta, esPedido: false }
}

function normalizarItems(input) {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map(item => {
      if (typeof item === 'string') {
        const nombre = item.trim()
        return nombre ? { nombre: nombre, cantidad: 1, detalle: null } : null
      }
      if (typeof item === 'object' && item !== null) {
        const nombre = item.nombre || item.name || item.item || item.product || item.plato || null
        if (!nombre) return null
        const cantidad = parseInt(item.cantidad || item.qty || item.quantity, 10) || 1
        const detalle = item.detalle || item.detail || item.note || item.salsa || item.sabor || null
        return { nombre: String(nombre).trim(), cantidad: Math.max(1, cantidad), detalle: detalle ? String(detalle).trim() : null }
      }
      return null
    }).filter(Boolean)
  }
  if (typeof input === 'string') {
    const texto = input.trim()
    if (!texto) return []
    const partes = texto.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
    return partes.map(nombre => ({ nombre: nombre, cantidad: 1, detalle: null }))
  }
  if (typeof input === 'object' && input !== null) {
    const nombre = input.nombre || input.name || input.item || input.product || input.plato || null
    if (nombre) {
      const cantidad = parseInt(input.cantidad || input.qty, 10) || 1
      const detalle = input.detalle || input.detail || input.salsa || input.sabor || null
      return [{ nombre: String(nombre).trim(), cantidad: Math.max(1, cantidad), detalle: detalle ? String(detalle).trim() : null }]
    }
  }
  return []
}

function formatearCarrito(articulos) {
  if (!articulos || articulos.length === 0) return 'Carrito vacio.'
  return articulos.map(i => {
    let linea = '  ' + i.cantidad + 'x ' + i.nombre + ' — $' + (i.precio * i.cantidad)
    if (i.detalle) linea += ' (' + i.detalle + ')'
    return linea
  }).join('\n')
}

function ticket(sesion) {
  if (!sesion || !sesion.articulos || sesion.articulos.length === 0) {
    return 'Tu carrito esta vacio.\nDime que se te antoja del menu para empezar.'
  }
  const lineas = []
  lineas.push(negocio.nombre)
  lineas.push('Tu pedido:')
  lineas.push('')
  for (const a of sesion.articulos) {
    const sub = a.precio * a.cantidad
    let linea = a.cantidad + 'x ' + a.nombre
    if (a.detalle) linea += ' (' + a.detalle + ')'
    linea += ' - $' + sub
    lineas.push(linea)
  }
  lineas.push('')
  lineas.push('Total: $' + sesion.total)
  return lineas.join('\n')
}

async function armando(articulos, texto, historialTexto) {
  const prompt = [
    'Eres el mesero de "' + negocio.nombre + '" en Mexico. Tomas pedidos por WhatsApp de forma calida, natural y breve. Hablas de tu, sin voseo.',
    '',
    'MENU:',
    formatearMenu(),
    '',
    'CARRITO ACTUAL:',
    formatearCarrito(articulos),
    '',
    historialTexto ? 'HISTORIAL RECIENTE:\n' + historialTexto + '\n' : '',
    'EL CLIENTE DICE AHORA:',
    '"' + texto + '"',
    '',
    'Devuelve SOLO un JSON valido con este formato exacto:',
    '',
    '{"agregar":[],"quitar":[],"finalizar":false,"resumen":"tu respuesta"}',
    '',
    'CAMPOS:',
    '- agregar: array de objetos con "nombre" exacto del menu, "cantidad" numero, "detalle" con salsa o sabor o null',
    '- quitar: array de objetos con "nombre" y "cantidad"',
    '- finalizar: true SOLO si el cliente dice que ya no quiere nada mas, que es todo o pide la cuenta',
    '- resumen: tu respuesta natural como mesero mexicano, breve, calida, de tu, maximo 2 lineas',
    '',
    'NOMBRES EXACTOS DEL MENU:',
    '- Alitas ($85)',
    '- Costillas BBQ ($95)',
    '- Salchipulpos ($45)',
    '- Papas a la francesa ($45)',
    '- Refresco de Tutifruti ($25)',
    '- Refresco de Limón ($25)',
    '- Refresco de Uva ($25)',
    '- Jugo de Mango ($25)',
    '- Jugo de Guayaba ($25)',
    '- Agua Natural ($25)',
    '',
    'SALSAS VALIDAS: BBQ, Mango Habanero, Tamarindo, Ranch, Fresa Tajín, Chipotle Frutos Rojos',
    '',
    'REGLAS IMPORTANTES:',
    '- "agregar" SIEMPRE es array de objetos, NUNCA string.',
    '- Si pide alitas o costillas con salsa incluida en el mismo mensaje, guarda el detalle de una vez.',
    '- Si pide alitas o costillas sin salsa, deja detalle null y pregunta la salsa de forma natural en el resumen.',
    '- Si solo aclara la salsa de algo que ya esta en el carrito, devuelve agregar con ese mismo producto y el detalle para actualizar, sin aumentar de mas.',
    '- Si pide refresco, jugo o agua sin sabor, deja detalle null y pregunta el sabor en el resumen.',
    '- "costillitas", "costilla", "alita" son formas coloquiales de Costillas BBQ y Alitas.',
    '- "mango" solo normalmente es Jugo de Mango. "Mango Habanero" es salsa.',
    '- En el resumen no repitas el ticket completo, no uses arte ASCII, no uses cuadros. Solo confirma brevemente y pregunta si quiere algo mas.',
    '- Si finalizar es true, confirma brevemente que el pedido esta completo, sin pedir ubicacion, la ubicacion la pide el sistema despues.',
  ].join('\n')
  const raw = await ai.generarJSON(prompt, texto)
  console.log('[IA JSON]', JSON.stringify(raw))
  if (!raw || typeof raw !== 'object') {
    console.log('[IA] raw no es objeto:', typeof raw)
    return { agregar: [], quitar: [], finalizar: false, resumen: null }
  }
  const agregar = normalizarItems(raw.agregar)
  const quitar = normalizarItems(raw.quitar)
  console.log('[IA] agregar normalizado:', JSON.stringify(agregar), 'quitar:', JSON.stringify(quitar))
  return {
    agregar: agregar,
    quitar: quitar,
    finalizar: !!raw.finalizar,
    resumen: typeof raw.resumen === 'string' && raw.resumen.trim() ? raw.resumen.trim() : null
  }
}

async function extraerItems(texto, historialTexto) {
  const prompt = [
    'Eres el extractor de pedidos de "' + negocio.nombre + '".',
    '',
    'MENU:',
    formatearMenu(),
    '',
    historialTexto ? 'HISTORIAL:\n' + historialTexto + '\n' : '',
    'MENSAJE:',
    '"' + texto + '"',
    '',
    'Devuelve SOLO JSON: {"tienePedido":false,"items":[]}',
    'Si el mensaje menciona comida o bebida del menu para ordenar, tienePedido true e items con nombre exacto del menu, cantidad y detalle de salsa o sabor o null.',
    'Si solo saluda o pregunta informacion, tienePedido false.',
  ].join('\n')
  const raw = await ai.generarJSON(prompt, texto)
  if (!raw || typeof raw !== 'object') return { tienePedido: false, items: [] }
  if (!raw.tienePedido) return { tienePedido: false, items: [] }
  const items = normalizarItems(raw.items || raw.agregar || [])
  if (!items.length) return { tienePedido: false, items: [] }
  return { tienePedido: true, items: items }
}

module.exports = { procesar, armando, extraerItems, ticket }
