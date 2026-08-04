const AI_PROVIDER = process.env.AI_PROVIDER || 'openrouter'
const AI_API_KEY = process.env.AI_API_KEY
const AI_API_URL = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
const AI_MODELS = (process.env.AI_MODELS || process.env.AI_MODEL || 'openrouter/free')
  .split(',').map(m => m.trim()).filter(Boolean)

const GEMINI_PROJECT = process.env.GEMINI_PROJECT
const GEMINI_REGION = process.env.GEMINI_REGION || 'us-central1'
const GEMINI_SA_FILE = process.env.GEMINI_SA_FILE
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-2.5-flash')
  .split(',').map(m => m.trim()).filter(Boolean)

let vertexAuth = null

async function getVertexToken() {
  if (!vertexAuth) {
    const { GoogleAuth } = require('google-auth-library')
    vertexAuth = new GoogleAuth({ keyFile: GEMINI_SA_FILE, scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  }
  const client = await vertexAuth.getClient()
  const token = await client.getAccessToken()
  return token.token
}

async function generar(sistema, mensaje) {
  if (AI_PROVIDER === 'openrouter' || AI_PROVIDER === 'openai') {
    return generarOpenAI(sistema, mensaje)
  }
  if (AI_PROVIDER === 'gemini') {
    return generarGemini(sistema, mensaje)
  }
  if (AI_PROVIDER === 'gemini-vertex') {
    return generarGeminiVertex(sistema, mensaje)
  }

  console.error('[ERR] AI_PROVIDER "' + AI_PROVIDER + '" no soportado')
  return 'Disculpa, no puedo responder en este momento.'
}

async function generarOpenAI(sistema, mensaje) {
  if (!AI_API_KEY) {
    console.error('[ERR] Falta AI_API_KEY en .env')
    return 'Disculpa, no puedo responder en este momento.'
  }

  const body = {
    ...(AI_MODELS.length > 1 ? { models: AI_MODELS } : { model: AI_MODELS[0] }),
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

  try {
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

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + AI_MODELS[0] + ':generateContent?key=' + AI_API_KEY
  const body = {
    system_instruction: { parts: [{ text: sistema }] },
    contents: [{ role: 'user', parts: [{ text: mensaje }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
  }

  try {
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

async function generarGeminiVertex(sistema, mensaje) {
  if (!GEMINI_SA_FILE || !GEMINI_PROJECT) {
    console.error('[ERR] Falta GEMINI_SA_FILE o GEMINI_PROJECT en .env')
    return 'Disculpa, no puedo responder en este momento.'
  }

  let token
  try {
    token = await getVertexToken()
  } catch (err) {
    console.error('[ERR] Vertex Auth: ' + err.message)
    return 'Disculpa, tengo un problema de autenticacion. Intenta de nuevo mas tarde.'
  }

  const contents = [{ role: 'user', parts: [{ text: mensaje }] }]

  for (const model of GEMINI_MODELS) {
    const url = 'https://' + GEMINI_REGION + '-aiplatform.googleapis.com/v1/projects/' +
      GEMINI_PROJECT + '/locations/' + GEMINI_REGION + '/publishers/google/models/' + model + ':generateContent'

    const body = {
      contents: contents,
      systemInstruction: { parts: [{ text: sistema }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('[ERR] Vertex ' + model + ': ' + res.status + ' ' + errText)
        continue
      }

      const data = await res.json()
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (texto) return texto.trim()
      console.error('[ERR] Vertex ' + model + ': respuesta vacia')
    } catch (err) {
      console.error('[ERR] Vertex ' + model + ': ' + err.message)
    }
  }

  console.error('[ERR] Vertex: todos los modelos fallaron')
  return 'Disculpa, todos mis canales de IA estan ocupados. Intenta de nuevo mas tarde.'
}

module.exports = { generar }
