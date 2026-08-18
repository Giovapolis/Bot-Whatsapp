const ai = require('./ai')
const { negocio, obtenerSystemPrompt } = require('./negocio')

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

function formatearCarrito(articulos) {
  if (!articulos || articulos.length === 0) return 'CARRITO ACTUAL: (vacío)'
  const lineas = articulos.map(i => {
    let linea = i.cantidad + 'x ' + i.nombre + ' ($' + i.precio + ' c/u)'
    if (i.detalle) linea += ' — ' + i.detalle
    return linea
  })
  return 'CARRITO ACTUAL:\n- ' + lineas.join('\n- ')
}

function normalizarItems(input) {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map(item => {
      if (typeof item === 'string') return { nombre: item, cantidad: 1, detalle: null }
      if (typeof item === 'object' && item !== null) {
        const nombre = item.nombre || item.name || item.item || item.product || item.plato || null
        if (!nombre) return null
        return { nombre: nombre, cantidad: parseInt(item.cantidad || item.qty || item.quantity, 10) || 1, detalle: item.detalle || item.detail || item.note || null }
      }
      return null
    }).filter(Boolean)
  }
  if (typeof input === 'string') return [{ nombre: input, cantidad: 1, detalle: null }]
  if (typeof input === 'object') {
    const nombre = input.nombre || input.name || input.item || input.product || input.plato || null
    if (nombre) return [{ nombre: nombre, cantidad: parseInt(input.cantidad || input.qty, 10) || 1, detalle: input.detalle || null }]
  }
  return []
}

async function armando(articulos, texto) {
  const prompt = [
    'Sos el mesero de "' + negocio.nombre + '". Estás armando un pedido por WhatsApp.',
    '',
    'MENÚ:',
    formatearMenu(),
    '',
    'CARRITO ACTUAL:',
    formatearCarrito(articulos),
    '',
    'EL CLIENTE DICE:',
    '"' + texto + '"',
    '',
    'Tu tarea: analizar qué quiere el cliente y devolver SOLO un JSON válido.',
    '',
    'FORMATO:',
    '{"agregar":[],"quitar":[],"finalizar":false,"resumen":"<tu respuesta>"}',
    '',
    'CAMPOS:',
    '- agregar: [{"nombre":"<nombre exacto>","cantidad":1,"detalle":"Salsa: X" o "Sabor: X" o null}]',
    '- quitar: [{"nombre":"<nombre exacto>","cantidad":1}]',
    '- finalizar: true cuando el cliente indique que ya no quiere nada más ("ya es todo", "nada más", "creo que sí", "eso es todo", "creo que con eso", etc.)',
    '- resumen: tu respuesta natural al cliente, como si fueras el mesero hablando',
    '',
    'EJEMPLOS DE CONVERSACIÓN:',
    '',
    'Cliente: "Quiero 2 alitas y un refresco de limón"',
    '{"agregar":[{"nombre":"Alitas","cantidad":2,"detalle":null},{"nombre":"Refrescos","cantidad":1,"detalle":"Sabor: Limón"}],"quitar":[],"finalizar":false,"resumen":"Perfecto, 2 alitas y 1 refresco de limón. ¿De qué salsa querés las alitas?"}',
    '',
    'Cliente: "BBQ"',
    '{"agregar":[{"nombre":"Alitas","cantidad":1,"detalle":"Salsa: BBQ"}],"quitar":[],"finalizar":false,"resumen":"Listo, 2 alitas con BBQ y 1 refresco de limón. ¿Algo más?"}',
    '',
    'Cliente: "Las alitas ponelas con mango habanero"',
    '{"agregar":[],"quitar":[],"finalizar":false,"resumen":"Cambié las alitas a mango habanero. ¿Algo más?"}',
    '',
    'Cliente: "Dame 2 costillas y unas papas"',
    '{"agregar":[{"nombre":"Costillas BBQ","cantidad":2,"detalle":null},{"nombre":"Papas a la francesa","cantidad":1,"detalle":null}],"quitar":[],"finalizar":false,"resumen":"Anoté 2 costillas BBQ y papas a la francesa. ¿De qué salsa querés las costillas?"}',
    '',
    'Cliente: "Creo que ya es todo"',
    '{"agregar":[],"quitar":[],"finalizar":true,"resumen":"¡Genial! Compartime tu ubicación para la entrega 📍"}',
    '',
    'Cliente: "Quiero 2 alitas BBQ y 1 jugo de mango"',
    '{"agregar":[{"nombre":"Alitas","cantidad":2,"detalle":"Salsa: BBQ"},{"nombre":"Jugos","cantidad":1,"detalle":"Sabor: Mango"}],"quitar":[],"finalizar":false,"resumen":"Anoté 2 alitas con BBQ y 1 jugo de mango. ¿Algo más?"}',
    '',
    'Cliente: "Quita las papas"',
    '{"agregar":[],"quitar":[{"nombre":"Papas a la francesa","cantidad":1}],"finalizar":false,"resumen":"Listo, quité las papas. ¿Algo más?"}',
    '',
    'REGLAS:',
    '- nombre EXACTO del menú: "Alitas", "Costillas BBQ", "Salchipulpos", "Papas a la francesa", "Tutifruti", "Limón", "Uva", "Mango", "Guayaba", "Natural".',
    '- Si pide alitas/costillas SIN salsa: agregá con detalle null, preguntá la salsa en resumen.',
    '- Si pide refresco/jugo SIN sabor: agregá con detalle null, preguntá el sabor en resumen.',
    '- Si el cliente aclara salsa/sabor después: actualizá el detalle del item existente.',
    '- Si dice algo que no está en el menú: no agregues, explicá amablemente.',
    '- Tu resumen debe ser NATURAL, como un mesero hablando con el cliente.',
    '- Si el cliente confirma que ya no quiere nada más, finalizá y pedí la ubicación.',
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

module.exports = { procesar, armando }
