const keywords = [
  {
    palabras: ['menu', 'menú', 'carta', 'platillos', 'comida', 'comer'],
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
      '_Mandanos tu pedido y lo armamos_ 📦'
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
    palabras: ['ubicacion', 'direccion', 'donde', 'ubicación', 'dirección', 'llegar', 'mapa'],
    respuesta: [
      '📍 *UBICACION*',
      '',
      'Calle Principal #123, Col. Centro',
      'Tequixquiac, Estado de Mexico',
      '',
      '_A una cuadra del mercado municipal_',
      '',
      'Mandanos tu ubicacion y te decimos',
      'si llegamos a tu zona 🚗'
    ].join('\n'),
    esPedido: false
  },
  {
    palabras: ['contacto', 'telefono', 'teléfono', 'llamar', 'numero', 'whatsapp', 'contactar'],
    respuesta: [
      '📞 *CONTACTO*',
      '',
      'Telefono: 55-1234-5678',
      'WhatsApp: 55-1234-5678',
      'Instagram: @comidarica_oficial',
      '',
      '_Atencion telefonica:_',
      '_Lun a Sab 10:00 am - 9:00 pm_'
    ].join('\n'),
    esPedido: false
  },
  {
    palabras: ['pago', 'tarjeta', 'efectivo', 'transferencia', 'pagar', 'metodo'],
    respuesta: [
      '💳 *FORMAS DE PAGO*',
      '',
      'Efectivo',
      'Tarjeta de credito/debito',
      'Transferencia BBVA',
      'Mercado Pago',
      'PayPal',
      '',
      '_Precios con IVA incluido_'
    ].join('\n'),
    esPedido: false
  },
  {
    palabras: ['promo', 'promocion', 'promoción', 'oferta', 'descuento', 'especial', 'combo'],
    respuesta: [
      '🔥 *PROMOS DEL DIA*',
      '',
      '#1 2 pizzas medianas + 2 refrescos .. $199',
      '#2 5 tacos + papas + refresco ........ $139',
      '#3 Pizza familiar + 6 tacos + 2 bebidas $259',
      '',
      '_Validas hoy o hasta agotar_ ⏳'
    ].join('\n'),
    esPedido: false
  },
  {
    palabras: ['tiempo', 'tarda', 'demora', 'entrega', 'llega', 'cuanto'],
    respuesta: [
      '⏱ *TIEMPO DE ENTREGA*',
      '',
      'Centro ................. 20-30 min',
      'Norte .................. 30-45 min',
      'Sur .................... 25-40 min',
      '',
      '_Aproximado, puede variar segun demanda_ 🚗'
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
    palabras: ['gracias', 'muchas gracias', 'gracias', 'te agradezco', 'thanks'],
    respuesta: [
      'A ti! Cuando necesites algo, aca estoy 🙌',
      '',
      'Buen provecho! 🍕🌮🥤'
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
  'Preguntame:',
  '🍕 menu',
  '🕐 horario',
  '📍 ubicacion',
  '🔥 promos',
  '💳 formas de pago',
  '',
  'O hace tu pedido directamente 📦',
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
      return { respuesta: item.respuesta, esPedido: false }
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
