require('dotenv').config()

const responses = require('./src/responses')

const tests = [
  'Hola, buen dia!',
  'Que tienen para comer?',
  'Quiero una pizza familiar',
  'Cual es el horario?',
  'Gracias!',
  'A que hora cierran los domingos?',
  'Dos pizzas familiares y 3 tacos por favor',
  'Cual es el precio de las papas?',
  'Adios!'
]

async function ejecutar() {
  console.log('Prueba de AI responses\n')

  for (const msg of tests) {
    console.log('---')
    console.log('> ' + msg)
    try {
      const r = await responses.procesar(msg)
      if (r.esPedido) {
        console.log('=> PEDIDO detectado\n')
      } else {
        console.log('=> ' + r.respuesta + '\n')
      }
    } catch (err) {
      console.error('[ERR] ' + err.message + '\n')
    }
  }
}

ejecutar()
