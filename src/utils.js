function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function enviarMensaje(sock, jid, texto, tag) {
  try {
    await sock.sendMessage(jid, { text: texto })
    if (tag) console.log('[OK] ' + tag)
    return true
  } catch (err) {
    console.error('[ERR] ' + (tag ? tag + ': ' : '') + err.message)
    return false
  }
}

const CANCEL_WORDS = ['cancelar', 'cancel', 'salir', 'despues', 'nunca', 'no quiero', 'mejor no']

function esCancelacion(texto) {
  return CANCEL_WORDS.includes(texto.toLowerCase().trim())
}

const MAX_MSG_LENGTH = 500

function truncarTexto(texto) {
  if (!texto || texto.length <= MAX_MSG_LENGTH) return texto
  return texto.slice(0, MAX_MSG_LENGTH)
}

module.exports = { delay, enviarMensaje, esCancelacion, truncarTexto, CANCEL_WORDS }
