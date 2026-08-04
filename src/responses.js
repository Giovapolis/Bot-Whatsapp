const ai = require('./ai')
const negocio = require('./negocio')

let systemPrompt = ''

function obtenerPrompt() {
  if (!systemPrompt) {
    systemPrompt = negocio.obtenerSystemPrompt()
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
  const lineas = articulos.map(i => i.cantidad + 'x ' + i.nombre + ' ($' + i.precio + ' c/u)')
  return 'CARRITO ACTUAL:\n- ' + lineas.join('\n- ')
}

async function armando(articulos, texto) {
  const prompt = [
    'Eres el asistente virtual de "' + negocio.nombre + '", ' + negocio.tipo + '.',
    'Estas armando un pedido en una conversacion por WhatsApp.',
    '',
    'MENU (usa SOLO estos productos y precios, NO inventes):',
    negocio.formatearMenu(),
    '',
    formatearCarrito(articulos),
    '',
    'EL USUARIO ACABA DE ESCRIBIR:',
    '"' + texto + '"',
    '',
    'DEVUELVE SOLO JSON (sin markdown):',
    '{"agregar":[{"nombre":"<item exacto del menu>","cantidad":<numero>}],"quitar":[{"nombre":"<item exacto del menu>","cantidad":<numero>}],"finalizar":false,"resumen":"<frase breve natural en espanol>"}',
    '',
    'REGLAS PARA "agregar":',
    '- Si el usuario pide productos que ESTAN en el menu, listalos en "agregar".',
    '- "nombre" debe ser el nombre EXACTO que figura en el menu (ej: "Mediana", "Personal", "Familiar", "3 de suadero/pastor", "Refresco", "Papas grandes"). No le pongas la categoria delante.',
    '- La cantidad: la que indique el usuario, o 1.',
    '- Si no agrega nada del menu, "agregar" va vacio [].',
    '- Si pide algo que NO esta en el menu, "agregar": [] y en "resumen" explica con amabilidad que no esta disponible y ofrece opciones del menu.',
    '',
    'REGLAS PARA "quitar":',
    '- Si el usuario quiere RENUNCIAR/SACAR/ELIMINAR un producto ya anotado (dice "quita", "saca", "quita la pizza", "no quiero el refresco", "elimina la cerveza", etc.), listalos en "quitar" con su nombre exacto y cantidad (o 1 si no la dice).',
    '- Si el usuario modifica/cancela un producto pero sigue pidiendo mas cosas, pon en "agregar" lo nuevo y en "quitar" lo que quita.',
    '- Si no quita nada, "quitar" va vacio [].',
    '',
    'REGLAS PARA "finalizar":',
    '- true solo si el usuario quiere CERRAR el pedido (dice "la cuenta", "cuanto es", "total", "eso es todo", "ya no quiero nada mas", "completo", "lista", "listo", "finaliza", "nada mas", "concertar mi cuenta" o similar, o confirma que ESO ES TODA la orden).',
    '- Esta es la UNICA condicion para pedirle la ubicacion; NO la pidas antes.',
    '',
    'REGLAS PARA "resumen" (frase BREVE, una o dos lineas, con emojis):',
    '- No repitas todo el carrito: el sistema mostrara el ticket con el total automaticamente.',
    '- Si agrega: confirma breve lo que anotaste y pregunta si quiere algo mas o "la cuenta".',
    '- Si quita: confirma breve lo que quitaste y pregunta si algo mas o "la cuenta".',
    '- Si solo pide INFORMACION (menu, horario, precio, ambiente): responde esa info con amabilidad; NO pongas finalizar:true; el sistema igual mostrara el ticket.',
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