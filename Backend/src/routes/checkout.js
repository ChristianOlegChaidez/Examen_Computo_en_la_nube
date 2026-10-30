const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { ErrorHttp, asincrono } = require("../middlewares/errores");
const validar = require("../utils/validar");

const router = express.Router();

// Une líneas repetidas del mismo producto y valida cada una
function normalizaItems(items) {
  if (!Array.isArray(items) || !items.length) throw new ErrorHttp(400, "El carrito está vacío");
  const porProducto = new Map();
  for (const it of items) {
    const id = validar.entero(it.producto_id, "El producto", { min: 1 });
    const cantidad = validar.entero(it.cantidad, "La cantidad", { min: 1 });
    porProducto.set(id, (porProducto.get(id) || 0) + cantidad);
  }
  // Orden fijo por id para que compras simultáneas no se bloqueen entre sí
  return [...porProducto.entries()].sort((a, b) => a[0] - b[0]);
}

// Si hay sesión iniciada se liga la orden al usuario; si no, se compra como invitado
function usuarioOpcional(req) {
  const cabecera = req.headers.authorization || "";
  if (!cabecera.startsWith("Bearer ")) return null;
  try { return jwt.verify(cabecera.slice(7), process.env.JWT_SECRET).id; } catch { return null; }
}

// POST /api/checkout  { nombre, email, items: [{ producto_id, cantidad }] }
// Los precios y el total salen de la base de datos, nunca del navegador.
router.post("/", asincrono(async (req, res) => {
  const nombre = validar.texto(req.body.nombre, "El nombre", { max: 100 });
  const correo = validar.email(req.body.email);
  const items = normalizaItems(req.body.items);

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    const lineas = [];
    let totalCentavos = 0;
    for (const [productoId, cantidad] of items) {
      // Descuenta solo si alcanza; así dos compras a la vez no dejan el stock en negativo
      const { rows } = await cliente.query(
        `UPDATE productos SET stock = stock - $1
         WHERE id = $2 AND stock >= $1
         RETURNING id, nombre, precio`,
        [cantidad, productoId]
      );
      if (!rows.length) {
        const existe = await cliente.query("SELECT nombre, stock FROM productos WHERE id = $1", [productoId]);
        if (!existe.rows.length) throw new ErrorHttp(404, `El producto ${productoId} ya no existe`);
        const { nombre: nom, stock } = existe.rows[0];
        throw new ErrorHttp(409, `Stock insuficiente de "${nom}": quedan ${stock} y pediste ${cantidad}`);
      }
      const precio = Number(rows[0].precio);
      totalCentavos += Math.round(precio * 100) * cantidad;
      lineas.push({ productoId, cantidad, precio, nombre: rows[0].nombre });
    }

    const total = totalCentavos / 100;
    const orden = await cliente.query(
      `INSERT INTO ordenes (usuario_id, nombre_cliente, email_cliente, total)
       VALUES ($1, $2, $3, $4) RETURNING id, creado_en`,
      [usuarioOpcional(req), nombre, correo, total]
    );
    for (const l of lineas) {
      await cliente.query(
        "INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)",
        [orden.rows[0].id, l.productoId, l.cantidad, l.precio]
      );
    }

    await cliente.query("COMMIT");
    res.status(201).json({
      orden_id: orden.rows[0].id,
      total,
      items: lineas.map(l => ({ producto_id: l.productoId, nombre: l.nombre, cantidad: l.cantidad, precio_unitario: l.precio }))
    });
  } catch (err) {
    await cliente.query("ROLLBACK");
    throw err;
  } finally {
    cliente.release();
  }
}));

module.exports = router;
