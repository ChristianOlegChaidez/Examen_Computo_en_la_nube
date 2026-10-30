const { ErrorHttp } = require("../middlewares/errores");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor, campo, { max = 255, obligatorio = true } = {}) {
  const t = typeof valor === "string" ? valor.trim() : "";
  if (!t && obligatorio) throw new ErrorHttp(400, `${campo} es obligatorio`);
  if (t.length > max) throw new ErrorHttp(400, `${campo} no puede pasar de ${max} caracteres`);
  return t;
}

function email(valor) {
  const t = texto(valor, "El correo", { max: 150 }).toLowerCase();
  if (!EMAIL.test(t)) throw new ErrorHttp(400, "El correo no es válido");
  return t;
}

function entero(valor, campo, { min = 0 } = {}) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min) throw new ErrorHttp(400, `${campo} debe ser un entero mayor o igual a ${min}`);
  return n;
}

function dinero(valor, campo) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) throw new ErrorHttp(400, `${campo} debe ser un número mayor o igual a 0`);
  return Math.round(n * 100) / 100;
}

function listaTextos(valor, campo) {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor) || valor.some(v => typeof v !== "string")) {
    throw new ErrorHttp(400, `${campo} debe ser una lista de textos`);
  }
  return valor.map(v => v.trim()).filter(Boolean);
}

// Valida el cuerpo de un producto (crear y editar)
function producto(body) {
  const precio = dinero(body.precio, "El precio");
  const anterior = body.precio_anterior === undefined || body.precio_anterior === null || body.precio_anterior === ""
    ? null : dinero(body.precio_anterior, "El precio anterior");
  return {
    nombre: texto(body.nombre, "El nombre", { max: 120 }),
    descripcion: texto(body.descripcion, "La descripción", { max: 2000, obligatorio: false }),
    precio,
    precio_anterior: anterior,
    stock: entero(body.stock, "El stock"),
    categoria_id: entero(body.categoria_id, "La categoría", { min: 1 }),
    imagenes: listaTextos(body.imagenes, "Las imágenes"),
    medidas: listaTextos(body.medidas, "Las medidas"),
    nuevo: body.nuevo === true
  };
}

module.exports = { texto, email, entero, dinero, producto };
