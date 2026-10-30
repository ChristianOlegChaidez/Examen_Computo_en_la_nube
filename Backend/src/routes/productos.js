const express = require("express");
const pool = require("../db/pool");
const { ErrorHttp, asincrono } = require("../middlewares/errores");
const { requiereAdmin } = require("../middlewares/auth");
const validar = require("../utils/validar");

const router = express.Router();

const SELECT = `
  SELECT p.*, c.nombre AS categoria
  FROM productos p JOIN categorias c ON c.id = p.categoria_id`;

// Las fotos se guardan como nombre de archivo; aquí se arma la URL completa (S3 o carpeta local)
function urlImagen(img) {
  if (/^https?:\/\//.test(img)) return img;
  const base = (process.env.S3_BASE_URL || "/Imagenes").replace(/\/$/, "");
  return `${base}/${img}`;
}

function aJson(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio: Number(fila.precio),
    precio_anterior: fila.precio_anterior === null ? null : Number(fila.precio_anterior),
    stock: fila.stock,
    categoria_id: fila.categoria_id,
    categoria: fila.categoria,
    imagenes: fila.imagenes.map(urlImagen),
    medidas: fila.medidas,
    nuevo: fila.nuevo
  };
}

const idDeRuta = req => validar.entero(req.params.id, "El id", { min: 1 });

// Catálogo: GET /api/productos?categoria=Salas&q=sofa
router.get("/", asincrono(async (req, res) => {
  const filtros = [];
  const valores = [];
  if (req.query.categoria) {
    valores.push(req.query.categoria);
    filtros.push(`c.nombre = $${valores.length}`);
  }
  if (req.query.q) {
    valores.push(`%${req.query.q}%`);
    filtros.push(`(p.nombre ILIKE $${valores.length} OR p.descripcion ILIKE $${valores.length})`);
  }
  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
  const { rows } = await pool.query(`${SELECT} ${where} ORDER BY p.id`, valores);
  res.json(rows.map(aJson));
}));

router.get("/:id", asincrono(async (req, res) => {
  const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [idDeRuta(req)]);
  if (!rows.length) throw new ErrorHttp(404, "Producto no encontrado");
  res.json(aJson(rows[0]));
}));

const COLUMNAS = "nombre, descripcion, precio, precio_anterior, stock, categoria_id, imagenes, medidas, nuevo";

async function validaCategoria(id) {
  const { rowCount } = await pool.query("SELECT 1 FROM categorias WHERE id = $1", [id]);
  if (!rowCount) throw new ErrorHttp(400, "La categoría no existe");
}

router.post("/", requiereAdmin, asincrono(async (req, res) => {
  const p = validar.producto(req.body);
  await validaCategoria(p.categoria_id);
  const { rows } = await pool.query(
    `INSERT INTO productos (${COLUMNAS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [p.nombre, p.descripcion, p.precio, p.precio_anterior, p.stock, p.categoria_id, p.imagenes, p.medidas, p.nuevo]
  );
  const creado = await pool.query(`${SELECT} WHERE p.id = $1`, [rows[0].id]);
  res.status(201).json(aJson(creado.rows[0]));
}));

router.put("/:id", requiereAdmin, asincrono(async (req, res) => {
  const id = idDeRuta(req);
  const p = validar.producto(req.body);
  await validaCategoria(p.categoria_id);
  const { rowCount } = await pool.query(
    `UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, precio_anterior=$4, stock=$5,
       categoria_id=$6, imagenes=$7, medidas=$8, nuevo=$9 WHERE id=$10`,
    [p.nombre, p.descripcion, p.precio, p.precio_anterior, p.stock, p.categoria_id, p.imagenes, p.medidas, p.nuevo, id]
  );
  if (!rowCount) throw new ErrorHttp(404, "Producto no encontrado");
  const actualizado = await pool.query(`${SELECT} WHERE p.id = $1`, [id]);
  res.json(aJson(actualizado.rows[0]));
}));

router.delete("/:id", requiereAdmin, asincrono(async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM productos WHERE id = $1", [idDeRuta(req)]);
    if (!rowCount) throw new ErrorHttp(404, "Producto no encontrado");
    res.status(204).end();
  } catch (err) {
    // 23503 = llave foránea: el producto ya aparece en órdenes
    if (err.code === "23503") throw new ErrorHttp(409, "No se puede eliminar: el producto ya tiene órdenes. Déjalo sin stock.");
    throw err;
  }
}));

module.exports = router;
