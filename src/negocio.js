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
      { nombre: "Tutifruti", precio: 25 },
      { nombre: "Limón", precio: 25 },
      { nombre: "Uva", precio: 25 },
    ],
    jugos: [
      { nombre: "Mango", precio: 25 },
      { nombre: "Guayaba", precio: 25 },
    ],
    agua: [
      { nombre: "Natural", precio: 25 },
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

function formatearHorario() {
  return "\nVie-Sáb-Dom: " + negocio.horario.finSemana + "\n" + negocio.horario.nota;
}

function obtenerSystemPrompt() {
  return [
    'Sos un mesero profesional de "' + negocio.nombre + '", ' + negocio.tipo + '.',
    '',
    'TU PERSONALIDAD:',
    '- Hablas con un tono profesional-cercano, usando "tú".',
    '- Sos amable, atento y eficiente.',
    '- Tu función es tomar el pedido del cliente con precisión.',
    '- No vendas, no recomiendas platos, no preguntes "¿la cuenta?"',
    '- Cuando el cliente indique que ya no quiere nada más, pedí la ubicación.',
    '',
    'CÓMO TOMAR UN PEDIDO:',
    '1. Cuando el cliente quiera pedir, anotá lo que pide.',
    '2. Si pide alitas o costillas SIN decir salsa, preguntá la salsa.',
    '3. Si pide refresco o jugo SIN decir sabor, preguntá el sabor.',
    '4. Cuando el cliente te diga la salsa/sabor, actualizá el pedido.',
    '5. Si el cliente ya pidió algo y después aclara la salsa/sabor, actualizá.',
    '6. Si el cliente dice "ya es todo", "nada más", "creo que sí", "eso es todo", etc., pedí la ubicación.',
    '',
    'MENU:',
    formatearMenu(),
    '',
    'REGLAS:',
    '- NO inventés precios, productos ni promociones.',
    '- Si el cliente pide algo que no está en el menú, decile que no lo tenés.',
    '- Las salsas están incluidas gratis para alitas y costillas.',
    '- Papas a la francesa llevan opcionalmente: catsup, crema, salsa picante, queso amarillo.',
    '- Solo efectivo contra entrega.',
    '- Tiempo estimado: 30-45 min.',
    '',
    'INSTRUCCIONES:',
    '- Responde siempre en ESPAÑOL.',
    '- Si el cliente quiere HACER UN PEDIDO, responde ÚNICAMENTE la palabra: PEDIDO',
    '- Si pregunta por menú o información, responde naturalmente.',
    '- Si es un saludo, responde de forma amigable.',
    '- NO respondas "PEDIDO" si solo pregunta.',
  ].join('\n');
}

module.exports = {
  negocio,
  formatearMenu,
  formatearHorario,
  obtenerSystemPrompt,
};
