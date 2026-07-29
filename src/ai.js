const AI_PROVIDER = process.env.AI_PROVIDER || 'openrouter'
const AI_API_KEY = process.env.AI_API_KEY
const AI_MODEL = process.env.AI_MODEL || 'openrouter/free'
const AI_API_URL = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions'

async function generar(sistema, mensaje) {
  if (AI_PROVIDER === 'openrouter' || AI_PROVIDER === 'openai') {
    return generarOpenAI(sistema, mensaje)
  }
  if (AI_PROVIDER === 'gemini') {
    return generarGemini(sistema, mensaje)
  }

  console.error('[ERR] AI_PROVIDER "' + AI_PROVIDER + '" no soportado')
  return 'Disculpa, no puedo responder en este momento.'
}

async function generarOpenAI(sistema, mensaje) {
  if (!AI_API_KEY) {
    console.error('[ERR] Falta AI_API_KEY en .env')
    return 'Disculpa, no puedo responder en este momento.'
  }

  try {
    const body = {
      model: AI_MODEL,
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: mensaje }
      ],
      temperature: 0.7,
      max_tokens: 500
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + AI_API_KEY
    }

    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ERR] API: ' + res.status + ' ' + errText)
      return 'Disculpa, tengo un problema de conexion. Intenta de nuevo mas tarde.'
    }

    const data = await res.json()
    const texto = data.choices?.[0]?.message?.content || ''
    return texto.trim()
  } catch (err) {
    console.error('[ERR] API: ' + err.message)
    return 'Disculpa, tengo un problema de conexion. Intenta de nuevo mas tarde.'
  }
}

async function generarGemini(sistema, mensaje) {
  if (!AI_API_KEY) {
    console.error('[ERR] Falta AI_API_KEY en .env')
    return 'Disculpa, no puedo responder en este momento.'
  }

  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + AI_MODEL + ':generateContent?key=' + AI_API_KEY
    const body = {
      system_instruction: { parts: [{ text: sistema }] },
      contents: [{ role: 'user', parts: [{ text: mensaje }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ERR] Gemini: ' + res.status + ' ' + errText)
      return 'Disculpa, tengo un problema de conexion. Intenta de nuevo mas tarde.'
    }

    const data = await res.json()
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return texto.trim()
  } catch (err) {
    console.error('[ERR] Gemini: ' + err.message)
    return 'Disculpa, tengo un problema de conexion. Intenta de nuevo mas tarde.'
  }
}

module.exports = { generar }
