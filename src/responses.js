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

module.exports = { procesar }
