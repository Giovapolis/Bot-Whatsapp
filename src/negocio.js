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
    salchipulpos: [
      { nombre: "Salchipulpos", precio: 45 },
    ],
    acompañamientos: [
      { nombre: "Papas a la francesa", precio: 45, nota: "Opcional: catsup, crema, salsa picante, queso amarillo" },
    ],
    refrescos: [
      { nombre: "Refresco de Tutifruti", precio: 25 },
      { nombre: "Refresco de Limón", precio: 25 },
      { nombre: "Refresco de Uva", precio: 25 },
    ],
    jugos: [
      { nombre: "Jugo de Mango", precio: 25 },
      { nombre: "Jugo de Guayaba", precio: 25 },
    ],
    agua: [
      { nombre: "Agua Natural", precio: 25 },
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
  txt += "SALCHIPULPOS:\n" + m.salchipulpos.map((s) => "  " + s.nombre + " - $" + s.precio).join("\n") + "\n";
  txt += "ACOMPAÑAMIENTOS:\n" + m.acompañamientos.map((a) => "  " + a.nombre + " - $" + a.precio).join("\n") + "\n";
  txt += "REFRESCOS ($" + m.refrescos[0].precio + "):\n  " + m.refrescos.map((r) => r.nombre).join(" • ") + "\n";
  txt += "JUGOS ($" + m.jugos[0].precio + "):\n  " + m.jugos.map((j) => j.nombre).join(" • ") + "\n";
  txt += "AGUA ($" + m.agua[0].precio + "):\n  " + m.agua.map((a) => a.nombre).join(" • ") + "\n";
  txt += "SALSAS (incluidas para alitas y costillas):\n  " + negocio.salsas.join(" • ") + "\n";
  return txt;
}

function obtenerSystemPrompt() {
  return [
    'Eres un mesero profesional, muy atento, educado y amigable de "' + negocio.nombre + '", ' + negocio.tipo + ' en México.',
    '',
    'TU PERSONALIDAD Y TONO:',
    '- Hablas de "tú" de forma muy natural, cálida y servicial.',
    '- Eres extremadamente amable y eficiente.',
    '- Tu objetivo es identificar de inmediato cuando el cliente quiere pedir comida.',
    '',
    'REGLAS DE CLASIFICACIÓN DE PEDIDO:',
    '- Si el usuario menciona cualquier intención de ordenar, pedir o comprar comida del menú (ejemplo: "quiero pedir", "dame unas alitas", "me traes unas costillas", "quisiera ordenar", etc.), debes responder ÚNICAMENTE con la palabra: PEDIDO',
    '- No saludes, no agregues explicaciones, no uses formato Markdown. Responde solo la palabra: PEDIDO',
    '- Si el usuario solo saluda (ejemplo: "Hola", "Buenas noches"), hace preguntas de información general (ejemplo: "¿cuál es el horario?", "¿tienen servicio a domicilio?", "¿qué precio tienen las papas?"), responde de forma natural, amigable y muy educada en español de México, invitándole a realizar su pedido de manera cálida.',
    '',
    'MENU:',
    formatearMenu(),
    '',
    'REGLAS DEL NEGOCIO:',
    '- No inventes precios, productos ni promociones que no estén en el menú.',
    '- Si te piden algo que no está en el menú, aclárales amablemente que no lo manejas.',
    '- Las salsas son gratis e incluidas para alitas y costillas.',
    '- Papas a la francesa llevan opcionalmente: catsup, crema, salsa picante, queso amarillo.',
    '- Solo efectivo contra entrega.',
    '- Tiempo estimado: 30-45 min.',
  ].join('\n');
}

module.exports = {
  negocio,
  formatearMenu,
  obtenerSystemPrompt,
};
