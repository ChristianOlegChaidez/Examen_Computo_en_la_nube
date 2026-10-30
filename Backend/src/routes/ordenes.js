const express = require("express");
const pool = require("../db/pool");
const { ErrorHttp, asincrono } = require("../middlewares/errores");
const { requiereAdmin } = require("../middlewares/auth");
const validar = require("../utils/validar");

const router = express.Router();

const ESTADOS = ["pagada", "enviada", "cancelada"];

// Lista de órdenes con sus productos (solo administrador)
router.get("/", requiereAdmin, asincrono(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT o.id, o.nombre_cliente, o.email_cliente, o.total, o.estado, o.creado_en,
      COALESCE(json_agg(json_build_object(
        'producto_id', i.producto_id, 'nombre', p.nombre,
        'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario
      ) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
    FROM ordenes o
    LEFT JOIN orden_items i ON i.orden_id = o.id
    LEFT JOIN productos p ON p.id = i.producto_id
    GROUP BY o.id
    ORDER BY o.id DESC`);
  res.json(rows.map(o => ({ ...o, total: Number(o.total), items: o.items.map(i => ({ ...i, precio_unitario: Number(i.precio_unitario) })) })));
}));

// Cambia el estado. Si se cancela, regresa el stock al inventario.
router.patch("/:id/estado", requiereAdmin, asincrono(async (req, res) => {
  const id = validar.entero(req.params.id, "El id", { min: 1 });
  const estado = req.body.estado;
  if (!ESTADOS.includes(estado)) throw new ErrorHttp(400, `El estado debe ser: ${ESTADOS.join(", ")}`);

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const actual = await cliente.query("SELECT estado FROM ordenes WHERE id = $1 FOR UPDATE", [id]);
    if (!actual.rows.length) throw new ErrorHttp(404, "Orden no encontrada");
    if (actual.rows[0].estado === "cancelada") throw new ErrorHttp(409, "La orden ya está cancelada");
    if (estado === "cancelada") {
      await cliente.query(
        `UPDATE productos p SET stock = p.stock + i.cantidad
         FROM orden_items i WHERE i.orden_id = $1 AND i.producto_id = p.id`, [id]);
    }
    await cliente.query("UPDATE ordenes SET estado = $1 WHERE id = $2", [estado, id]);
    await cliente.query("COMMIT");
    res.json({ id, estado });
  } catch (err) {
    await cliente.query("ROLLBACK");
    throw err;
  } finally {
    cliente.release();
  }
}));

module.exports = router;
