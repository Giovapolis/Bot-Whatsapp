const { Pool } = require("pg");
const DIAS_RETENCION = parseInt(process.env.CLEANUP_DAYS || "15");
const URL_BD = process.env.DATABASE_URL || "";

let pool = null;

async function inicializar() {
  if (URL_BD.startsWith("postgresql://") || URL_BD.startsWith("postgres://")) {
    pool = new Pool({ connectionString: URL_BD });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        hora TEXT NOT NULL,
        ubicacion JSONB,
        estado TEXT NOT NULL DEFAULT 'nuevo',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[DB] PostgreSQL conectado");
    programarLimpieza();
    const { rows } = await pool.query(
      "SELECT * FROM pedidos ORDER BY created_at DESC",
    );
    return rows;
  }
  console.log("[DB] Modo memoria (dev)");
  return [];
}

async function guardarPedido(data) {
  if (pool) {
    await pool.query(
      `INSERT INTO pedidos (id, nombre, telefono, mensaje, hora, ubicacion, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.id,
        data.nombre,
        data.telefono,
        data.mensaje,
        data.hora,
        data.ubicacion ? JSON.stringify(data.ubicacion) : null,
        data.estado,
      ],
    );
  }
}

async function actualizarEstado(id, estado) {
  if (pool) {
    await pool.query("UPDATE pedidos SET estado = $1 WHERE id = $2", [
      estado,
      id,
    ]);
  }
}

function programarLimpieza() {
  setInterval(async () => {
    if (!pool) return;
    try {
      const { rowCount } = await pool.query(
        "DELETE FROM pedidos WHERE estado = $1 AND created_at < NOW() - $2::interval",
        ["entregado", DIAS_RETENCION + " days"],
      );
      if (rowCount > 0) {
        console.log(
          "[DB] Limpieza: " +
            rowCount +
            " pedidos eliminados (mas de " +
            DIAS_RETENCION +
            " dias)",
        );
      }
    } catch (err) {
      console.error("[ERR] Limpieza DB: " + err.message);
    }
  }, 86400000);
}

async function cerrar() {
  if (pool) await pool.end();
}

module.exports = {
  inicializar,
  guardarPedido,
  actualizarEstado,
  cerrar,
};
