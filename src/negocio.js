const negocio = {
  nombre: "Wings Doble R",
  tipo: "Restaurante de alitas y costillas BBQ",
  menu: {
    alitas: [
      { nombre: "Alitas", precio: 85 },
    ],
    costillas: [
      { nombre: "Costillas BBQ", precio: 95 },
    ],
    acompañamientos: [
      { nombre: "Papas a la francesa", precio: 45, nota: "Opcional: catsup, crema, salsa picante, queso amarillo" },
      { nombre: "Salchipulpos", precio: 45 },
    ],
    bebidas: [
      { nombre: "Refrescos", precio: 25 },
    ],
  },
  salsas: [
    "BBQ",
    "Mango Habanero",
    "Tamarindo",
    "Ranch",
    "Fresa Tajín",
    "Chipotle Frutos Rojos",
  ],
  horario: {
    nota: "Los horarios pueden variar en días festivos o por situaciones especiales.",
    finSemana: "06:00 pm - 11:30 pm",
  },
  reglas: [
    "No hay descuentos ni promociones activas actualmente",
    "Solo se acepta efectivo contra entrega",
    "No se hacen envíos fuera de la zona de cobertura",
    "Tiempo estimado de entrega: 30-45 min",
  ],
};

function formatearMenu() {
  const m = negocio.menu;
  let txt = "MENÚ:\n";
  txt += "ALITAS:\n" + m.alitas.map((p) => "  " + p.nombre + " - $" + p.precio).join("\n") + "\n";
  txt += "COSTILLAS:\n" + m.costillas.map((c) => "  " + c.nombre + " - $" + c.precio).join("\n") + "\n";
  txt += "ACOMPAÑAMIENTOS:\n" + m.acompañamientos.map((a) => "  " + a.nombre + " - $" + a.precio).join("\n") + "\n";
  txt += "REFRESCOS:\n" + m.bebidas.map((b) => "  " + b.nombre + " - $" + b.precio).join("\n") + "\n";
  txt += "SALSAS (incluidas para alitas y costillas):\n  " + negocio.salsas.join(" • ") + "\n";
  return txt;
}

function formatearHorario() {
  return "\nVie-Sáb-Dom: " + negocio.horario.finSemana + "\n" + negocio.horario.nota;
}

function obtenerSystemPrompt() {
  return [
    'Eres el asistente virtual de "' + negocio.nombre + '", ' + negocio.tipo + ".",
    "",
    "INFORMACIÓN DEL NEGOCIO (USA SOLO ESTO, NO INVENTES NADA):",
    formatearMenu(),
    "",
    formatearHorario(),
    "",
    "REGLAS:",
    negocio.reglas.map((r) => "- " + r).join("\n"),
    "",
    "INSTRUCCIONES:",
    "- Responde siempre en ESPAÑOL, con emojis, tono amigable.",
    "- Si el usuario quiere HACER UN PEDIDO (comprar, ordenar, encargar algo del menú), responde ÚNICAMENTE la palabra exacta: PEDIDO",
    "- Si pregunta por menú, horario o información del negocio, responde naturalmente usando SOLO la información proporcionada.",
    "- Si es un saludo o conversación casual, responde de forma amigable presentando el restaurante.",
    "- NO inventes precios, platillos, promociones ni información que no esté en la sección de arriba.",
    '- NO respondas "PEDIDO" si solo está preguntando sobre el menú o haciendo una consulta.',
    "- Si el cliente ordena papas a la francesa, menciona que llevan opcionalmente: catsup, crema, salsa picante, queso amarillo.",
    "- Las salsas están incluidas gratis para alitas y costillas.",
  ].join("\n");
}

module.exports = {
  negocio,
  formatearMenu,
  formatearHorario,
  obtenerSystemPrompt,
};
