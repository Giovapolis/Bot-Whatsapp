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
    'Estas armando un pedido en una conversacion por WhatsApp.',
    '',
    'MENU (usa SOLO estos productos y precios, NO inventes):',
    formatearMenu(),
    '',
    formatearCarrito(articulos),
    '',
    'EL USUARIO ACABA DE ESCRIBIR:',
    '"' + texto + '"',
    '',
    'DEVUELVE SOLO JSON (sin markdown):',
    '{"agregar":[{"nombre":"<item exacto del menu>","cantidad":<numero>,"detalle":"<Salsa: X> o <Sabor: X> o null"}],"quitar":[{"nombre":"<item exacto del menu>","cantidad":<numero>}],"finalizar":false,"resumen":"<frase breve natural en espanol>"}',
    '',
    'REGLAS PARA "agregar":',
    '- Si el usuario pide productos que ESTAN en el menu, listalos en "agregar".',
    '- "nombre" debe ser el nombre EXACTO que figura en el menu (ej: "Alitas", "Costillas BBQ", "Salchipulpos", "Papas a la francesa", "Tutifruti", "Mango", "Natural"). No le pongas la categoria delante.',
    '- La cantidad: la que indique el usuario, o 1.',
    '- Si no agrega nada del menu, "agregar" va vacio [].',
    '- Si pide algo que NO esta en el menu, "agregar": [] y en "resumen" explica con amabilidad que no esta disponible y ofrece opciones del menu.',
    '',
    'REGLAS PARA "detalle" (campo opcional en cada item de "agregar"):',
    '- Si el usuario pide ALITAS o COSTILLAS y NO especifico salsa, en "resumen" pregunta: "¿De qué salsa querés? Tenemos: BBQ, Mango Habanero, Tamarindo, Ranch, Fresa Tajín, Chipotle Frutos Rojos". NO pongas finalizar:true. El "detalle" de esos items va null.',
    '- Si el usuario pide REFRESCOS y NO especifico sabor, en "resumen" pregunta: "¿Refresco de qué sabor? Tenemos Tutifruti, Limón y Uva". NO pongas finalizar:true. El "detalle" va null.',
    '- Si el usuario pide JUGOS y NO especifico sabor, en "resumen" pregunta: "¿Jugo de qué sabor? Tenemos Mango y Guayaba". NO pongas finalizar:true. El "detalle" va null.',
    '- Si el usuario pide AGUA, no hace falta preguntar sabor (es natural). El "detalle" va null.',
    '- Cuando el usuario SI especifica salsa o sabor, inclui "detalle" con el formato "Salsa: X" o "Sabor: X". Ejemplo: "Salsa: BBQ", "Sabor: Limón".',
    '- Si el usuario responde con la salsa/sabor que le preguntaste, AGREGA el item correspondiente con su "detalle" y confirma.',
    '- Si el usuario pide varios items, inclui "detalle" en cada uno que lo requiera.',
    '',
    'REGLAS PARA "quitar":',
    '- Si el usuario quiere RENUNCIAR/SACAR/ELIMINAR un producto ya anotado (dice "quita", "saca", "no quiero el refresco", "elimina", etc.), listalos en "quitar" con su nombre exacto y cantidad (o 1 si no la dice).',
    '- Si el usuario modifica/cancela un producto pero sigue pidiendo mas cosas, pon en "agregar" lo nuevo y en "quitar" lo que quita.',
    '- Si no quita nada, "quitar" va vacio [].',
    '',
    'REGLAS PARA "finalizar":',
    '- true solo si el usuario quiere CERRAR el pedido (dice "la cuenta", "cuanto es", "total", "eso es todo", "ya no quiero nada mas", "completo", "lista", "listo", "finaliza", "nada mas" o similar).',
    '- Esta es la UNICA condicion para pedirle la ubicacion; NO la pidas antes.',
    '- NO pongas finalizar:true si estas en proceso de preguntar salsa o sabor.',
    '',
    'REGLAS PARA "resumen" (frase BREVE, una o dos lineas, con emojis):',
    '- No repitas todo el carrito: el sistema mostrara el ticket con el total automaticamente.',
    '- Si agrega: confirma breve lo que anotaste y pregunta si quiere algo mas o "la cuenta".',
    '- Si agrega alitas/costillas sin salsa: pregunta por la salsa antes de confirmar.',
    '- Si agrega bebidas sin sabor: pregunta por el sabor antes de confirmar.',
    '- Si quita: confirma breve lo que quitaste y pregunta si algo mas o "la cuenta".',
    '- Si solo pide INFORMACION (menu, horario, precio): responde esa info con amabilidad; NO pongas finalizar:true.',
    '- Si pide cerrar: di algo cordial tipo "Perfecto, esta es tu cuenta" y que compartira la ubicacion para el envio.'
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