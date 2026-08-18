const ai = require('./ai')
const { negocio, obtenerSystemPrompt, formatearMenu } = require('./negocio')

let systemPrompt = ''

function obtenerPrompt() {
  if (!systemPrompt) {
    systemPrompt = obtenerSystemPrompt()
  }
  return systemPrompt
}

async function procesar(texto) {
  const prompt = obtenerPrompt()
  const respuesta = await ai.generar(prompt, texto)

  if (respuesta === 'PEDIDO') {
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
        const detalle = item.detalle || item.detail || item.note || null
        return { nombre: String(nombre).trim(), cantidad: cantidad, detalle: detalle }
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
      return [{ nombre: String(nombre).trim(), cantidad: cantidad, detalle: input.detalle || null }]
    }
  }
  return []
}

function formatearCarrito(articulos) {
  if (!articulos || articulos.length === 0) return 'Carrito vacio.'
  return articulos.map(i => {
    let linea = '  ' + i.cantidad + 'x ' + i.nombre + ' — $' + (i.precio * i.cantidad)
    if (i.detalle) linea += '\n    ' + i.detalle
    return linea
  }).join('\n')
}

function ticket(sesion) {
  if (!sesion || !sesion.articulos || sesion.articulos.length === 0) {
    return 'Tu carrito esta vacio.\nAgrega algo del menu para comenzar.'
  }
  const lineas = []
  lineas.push('╔═══════════════════════╗')
  lineas.push('║  ' + negocio.nombre.toUpperCase() + '  ║')
  lineas.push('╚═══════════════════════╝')
  lineas.push('')
  for (const a of sesion.articulos) {
    const sub = a.precio * a.cantidad
    lineas.push('  ' + a.cantidad + 'x ' + a.nombre + ' — $' + sub)
    if (a.detalle) lineas.push('    ' + a.detalle)
  }
  lineas.push('')
  lineas.push('───────────────────────')
  lineas.push('  TOTAL: $' + sesion.total)
  lineas.push('───────────────────────')
  return lineas.join('\n')
}

async function armando(articulos, texto) {
  const prompt = [
    'Sos el mesero de "' + negocio.nombre + '". Estas armando un pedido por WhatsApp.',
    '',
    'MENU:',
    formatearMenu(),
    '',
    'CARRITO ACTUAL:',
    formatearCarrito(articulos),
    '',
    'EL CLIENTE DICE:',
    '"' + texto + '"',
    '',
    'Devolve SOLO un JSON valido con este formato exacto:',
    '',
    '{"agregar":[],"quitar":[],"finalizar":false,"resumen":"tu respuesta"}',
    '',
    'CAMPOS:',
    '- agregar: array de objetos con "nombre" (exacto del menu), "cantidad" (numero), "detalle" (string o null)',
    '- quitar: array de objetos con "nombre" y "cantidad"',
    '- finalizar: true SOLO si el cliente dice que ya no quiere nada mas',
    '- resumen: tu respuesta natural como mesero',
    '',
    'NOMBRES EXACTOS DEL MENU:',
    '- Alitas ($85)',
    '- Costillas BBQ ($95)',
    '- Salchipulpos ($45)',
    '- Papas a la francesa ($45)',
    '- Tutifruti ($25)',
    '- Limon ($25)',
    '- Uva ($25)',
    '- Mango ($25)',
    '- Guayaba ($25)',
    '- Natural ($25)',
    '',
    'REGLAS IMPORTANTES:',
    '- El campo "agregar" SIEMPRE debe ser un array de objetos, NUNCA un string.',
    '- Ejemplo correcto: {"agregar":[{"nombre":"Alitas","cantidad":1,"detalle":null}]}',
    '- Ejemplo INCORRECTO: {"agregar":"Alitas"}',
    '- Si pide alitas/costillas sin salsa: detalle null, preguntar la salsa.',
    '- Si pide refresco/jugo sin sabor: detalle null, preguntar el sabor.',
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

module.exports = { procesar, armando, ticket }
