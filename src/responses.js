const ai = require('./ai')
const { negocio, formatearMenu, obtenerSystemPrompt } = require('./negocio')

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

async function armando(articulos, texto) {
  const prompt = [
    'Eres el asistente virtual de "' + negocio.nombre + '", ' + negocio.tipo + '.',
    'Estas armando un pedido por WhatsApp.',
    '',
    'MENU (usa SOLO estos productos y precios):',
    formatearMenu(),
    '',
    'SALSAS DISPONIBLES: BBQ, Mango Habanero, Tamarindo, Ranch, Fresa Tajin, Chipotle Frutos Rojos',
    'SABORES REFRESCOS: Tutifruti, Limon, Uva',
    'SABORES JUGOS: Mango, Guayaba',
    'AGUA: solo Natural',
    '',
    'CARRITO ACTUAL:',
    formatearCarrito(articulos),
    '',
    'MENSAJE DEL USUARIO:',
    '"' + texto + '"',
    '',
    'DEVUELVE SOLO JSON valido (sin markdown, sin trailing commas):',
    '{"agregar":[],"quitar":[],"finalizar":false,"resumen":""}',
    '',
    'CAMPOS:',
    '- agregar: array de items a agregar. Cada item: {"nombre":"<exacto del menu>","cantidad":1,"detalle":"Salsa: X" o "Sabor: X" o null}',
    '- quitar: array de items a quitar. Cada item: {"nombre":"<exacto>","cantidad":1}',
    '- finalizar: true solo si el cliente cierra el pedido ("la cuenta", "total", "listo", etc.)',
    '- resumen: frase breve con emojis confirmando que hiciste',
    '',
    'REGLAS:',
    '- nombre debe ser EXACTO del menu ("Alitas", "Costillas BBQ", "Salchipulpos", "Papas a la francesa", "Tutifruti", "Mango", "Natural").',
    '- Si el cliente pide alitas/costillas SIN especificar salsa: pon el item en agregar con detalle null, y en resumen pregunta por la salsa.',
    '- Si el cliente pide refresco/jugo SIN especificar sabor: pon el item en agregar con detalle null, y en resumen pregunta por el sabor.',
    '- Si el cliente YA pidio un item y DESPUES especifica la salsa/sabor, actualiza el detalle del item existente.',
    '- Si el cliente pide algo que no esta en el menu: agregar va [], resumen explica amablemente.',
    '- NO inventes precios ni productos que no esten en el menu.'
  ].join('\n')

  const raw = await ai.generarJSON(prompt, texto)

  if (!raw || typeof raw !== 'object') {
    return { agregar: [], quitar: [], finalizar: false, resumen: null }
  }

  return {
    agregar: Array.isArray(raw.agregar) ? raw.agregar : [],
    quitar: Array.isArray(raw.quitar) ? raw.quitar : [],
    finalizar: !!raw.finalizar,
    resumen: typeof raw.resumen === 'string' && raw.resumen.trim() ? raw.resumen.trim() : null
  }
}

module.exports = { procesar, armando }