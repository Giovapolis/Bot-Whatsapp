const negocio = {
  nombre: 'Comida Rica',
  tipo: 'Restaurante de pizzas y tacos',
  menu: {
    pizzas: [
      { nombre: 'Personal', precio: 89 },
      { nombre: 'Mediana', precio: 120 },
      { nombre: 'Familiar', precio: 189 },
      { nombre: 'Especial de la casa', precio: 149 }
    ],
    tacos: [
      { nombre: '3 de suadero/pastor', precio: 45 },
      { nombre: '5 orden', precio: 69 },
      { nombre: 'Gigante', precio: 55 }
    ],
    bebidas: [
      { nombre: 'Refresco', precio: 25 },
      { nombre: 'Agua', precio: 18 },
      { nombre: 'Jugo', precio: 35 },
      { nombre: 'Cerveza', precio: 45 }
    ],
    complementos: [
      { nombre: 'Papas grandes', precio: 55 },
      { nombre: 'Aros de cebolla', precio: 49 },
      { nombre: 'Nachos con queso', precio: 59 }
    ]
  },
  horario: {
    semana: '11:00 am - 11:00 pm',
    finSemana: '10:00 am - 12:00 am',
    nota: 'Cocina cierra 30 min antes'
  },
  reglas: [
    'No hay descuentos ni promociones activas actualmente',
    'Solo se acepta efectivo contra entrega',
    'No se hacen envios fuera de la zona de cobertura',
    'Tiempo estimado de entrega: 30-45 min'
  ]
}

function formatearMenu() {
  const m = negocio.menu
  let txt = 'MENU:\n'
  txt += 'PIZZAS:\n' + m.pizzas.map(p => '  ' + p.nombre + ' - $' + p.precio).join('\n') + '\n'
  txt += 'TACOS:\n' + m.tacos.map(t => '  ' + t.nombre + ' - $' + t.precio).join('\n') + '\n'
  txt += 'BEBIDAS:\n' + m.bebidas.map(b => '  ' + b.nombre + ' - $' + b.precio).join('\n') + '\n'
  txt += 'COMPLEMENTOS:\n' + m.complementos.map(c => '  ' + c.nombre + ' - $' + c.precio).join('\n')
  return txt
}

function formatearHorario() {
  return 'Horario:\nLun-Vie: ' + negocio.horario.semana + '\nSab-Dom: ' + negocio.horario.finSemana + '\n' + negocio.horario.nota
}

function obtenerSystemPrompt() {
  return [
    'Eres el asistente virtual de "' + negocio.nombre + '", ' + negocio.tipo + '.',
    '',
    'INFORMACION DEL NEGOCIO (USA SOLO ESTO, NO INVENTES NADA):',
    formatearMenu(),
    '',
    formatearHorario(),
    '',
    'REGLAS:',
    negocio.reglas.map(r => '- ' + r).join('\n'),
    '',
    'INSTRUCCIONES:',
    '- Responde siempre en ESPANOL, con emojis, tono amigable.',
    '- Si el usuario quiere HACER UN PEDIDO (comprar, ordenar, encargar algo del menu), responde UNICAMENTE la palabra exacta: PEDIDO',
    '- Si pregunta por menu, horario o informacion del negocio, responde naturalmente usando SOLO la informacion proporcionada.',
    '- Si es un saludo o conversacion casual, responde de forma amigable presentando el restaurante.',
    '- NO inventes precios, platillos, promociones ni informacion que no este en la seccion de arriba.',
    '- NO respondas "PEDIDO" si solo esta preguntando sobre el menu o haciendo una consulta.'
  ].join('\n')
}

module.exports = { negocio, formatearMenu, formatearHorario, obtenerSystemPrompt }
