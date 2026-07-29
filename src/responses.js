const keywords = [
  {
    palabras: ['menu', 'menú', 'comida', 'ofrece', 'tienen'],
    respuesta: '¡Estos son nuestros platillos!\n\n🍕 Pizzas desde $120\n🌮 Tacos desde $15\n🥤 Bebidas desde $25\n\n¿Qué se te antoja?',
    esPedido: false
  },
  {
    palabras: ['horario', 'abren', 'cierran', 'horarios'],
    respuesta: 'Estamos abiertos:\n\n📅 Lunes a Domingo\n⏰ 11:00 AM - 11:00 PM',
    esPedido: false
  },
  {
    palabras: ['ubicacion', 'direccion', 'donde', 'ubicación', 'dirección'],
    respuesta: 'Nos encontramos en:\n📍 Calle Principal 123, Centro\n\n¿Te ayudo con algo más?',
    esPedido: false
  },
  {
    palabras: ['contacto', 'telefono', 'teléfono', 'llamar'],
    respuesta: 'Puedes contactarnos al:\n📞 55-1234-5678\n\nO seguirnos en Instagram: @comidarica',
    esPedido: false
  },
  {
    palabras: ['formas de pago', 'pago', 'tarjeta', 'efectivo', 'transferencia'],
    respuesta: 'Aceptamos:\n💵 Efectivo\n💳 Tarjeta de crédito/débito\n📱 Transferencia bancaria\n🟢 Mercado Pago',
    esPedido: false
  },
  {
    palabras: ['promo', 'promocion', 'promoción', 'oferta', 'descuento', 'especial'],
    respuesta: '🔥 Promoción del día:\n2 Pizzas grandes + 2 bebidas por solo $199\n\n¡Aprovecha!',
    esPedido: false
  },
  {
    palabras: ['pedido', 'orden', 'quiero', 'ordeno', 'compro', 'encargo', 'llevar', 'domicilio', 'envio', 'envío'],
    respuesta: '¡Hemos recibido tu pedido! 🎉\n\nUno de nuestros asesores te confirmará en breve.\n\n¿Algo más que quieras agregar?',
    esPedido: true
  }
]

const defaultResponse = '¡Hola! Soy el asistente virtual de Comida Rica 🍽️\n\nPuedes preguntarme sobre:\n- 📋 Menú\n- ⏰ Horario\n- 📍 Ubicación\n- 💳 Formas de pago\n- 🔥 Promociones\n\nO simplemente escribe tu pedido y lo procesaremos.'

function procesar(texto) {
  const t = texto.toLowerCase().trim()

  for (const item of keywords) {
    const coincide = item.palabras.some(p => t.includes(p))
    if (coincide) {
      return { respuesta: item.respuesta, esPedido: item.esPedido }
    }
  }

  return { respuesta: defaultResponse, esPedido: false }
}

module.exports = { procesar }
