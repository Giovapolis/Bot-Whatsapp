const keywords = [
  {
    palabras: ['menu', 'menú', 'carta', 'platillos', 'comida', 'comer', 'precio', 'precios', 'cuestan', 'vale'],
    respuesta: [
      '🍕 *PIZZAS*',
      'Personal ................... $89',
      'Mediana .................... $120',
      'Familiar ................... $189',
      'Especial de la casa ........ $149',
      '',
      '🌮 *TACOS*',
      '3 de suadero/pastor ......... $45',
      '5 orden ..................... $69',
      'Gigante .................... $55',
      '',
      '🥤 *BEBIDAS*',
      'Refresco .................... $25',
      'Agua ....................... $18',
      'Jugo ....................... $35',
      'Cerveza .................... $45',
      '',
      '🍟 *COMPLEMENTOS*',
      'Papas grandes .............. $55',
      'Aros de cebolla ............ $49',
      'Nachos con queso ........... $59',
      '',
      '——————————',
      '¿Que se te antoja? Mandanos tu pedido 📦',
      '',
      '_Ej: \"2 pizzas familiares y 3 tacos\"_'
    ].join('\n'),
    esPedido: false
  },
  {
    palabras: ['horario', 'abren', 'cierran', 'horarios', 'atienden'],
    respuesta: [
      '🕐 *HORARIOS*',
      '',
      'Lun - Vie  11:00 am - 11:00 pm',
      'Sab - Dom  10:00 am - 12:00 am',
      '',
      '_Cocina cierra 30 min antes_'
    ].join('\n'),
    esPedido: false
  },
  {
    palabras: ['hola', 'buenas', 'buen dia', 'buen día', 'buenas tardes', 'buenas noches', 'que tal', 'buenass'],
    respuesta: null,
    esPedido: false,
    esSaludo: true
  },
  {
    palabras: ['gracias', 'muchas gracias', 'te agradezco', 'thanks'],
    respuesta: [
      'A ti! Cuando necesites algo, aca estoy 🙌',
      '',
      'Buen provecho! 🍕🌮'
    ].join('\n'),
    esPedido: false
  },
  {
    palabras: ['adios', 'adiós', 'bye', 'chao', 'nos vemos', 'hasta luego'],
    respuesta: [
      'Chau! Que tengas buen dia 🙌',
      '',
      'Cuando quieras pedir, aca estoy 🍕'
    ].join('\n'),
    esPedido: false
  }
]

const palavrasPedido = [
  'pedido', 'orden', 'ordeno', 'compro', 'encargo',
  'llevar', 'domicilio', 'envio', 'envío', 'ordenar',
  'comprar', 'necesito', 'manda', 'mandar', 'quiere',
  'me trae', 'quiero', 'quisiera', 'me gustaria',
  'me puede', 'me podria', 'podrias'
]

const palavrasQuery = [
  'saber', 'preguntar', 'ver', 'conocer', 'informacion',
  'información', 'consulta', 'ayuda', 'ayudar',
  'cual es', 'cuales son', 'que hay', 'que tiene',
  'me dice', 'me dices'
]

const defaultResponse = [
  'Hola, soy el asistente de *Comida Rica* 🍕🌮',
  '',
  'Preguntame por:',
  '🍕 menu',
  '🕐 horario',
  '',
  'O hace tu pedido directo 📦',
  '',
  '_Decime que se te antoja_'
].join('\n')

function procesar(texto) {
  const t = texto.toLowerCase().trim()

  for (const item of keywords) {
    const coincide = item.palabras.some(p => t.includes(p))
    if (coincide) {
      if (item.esSaludo) {
        return { respuesta: null, esPedido: false, esSaludo: true }
      }
      return { respuesta: item.respuesta, esPedido: false, esKeyword: true }
    }
  }

  const tieneQuery = palavrasQuery.some(p => t.includes(p))
  const tienePedido = palavrasPedido.some(p => t.includes(p))

  if (tienePedido && !tieneQuery) {
    return { respuesta: 'PEDIDO', esPedido: true }
  }

  return { respuesta: defaultResponse, esPedido: false }
}

module.exports = { procesar }
