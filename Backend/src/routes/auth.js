const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { ErrorHttp, asincrono } = require("../middlewares/errores");
const validar = require("../utils/validar");

const router = express.Router();

function respuestaSesion(usuario) {
  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  return { token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } };
}

// Registro de clientes (el rol admin solo se crea con "npm run db:admin")
router.post("/registro", asincrono(async (req, res) => {
  const nombre = validar.texto(req.body.nombre, "El nombre", { max: 100 });
  const correo = validar.email(req.body.email);
  const password = validar.texto(req.body.password, "La contraseña", { max: 100 });
  if (password.length < 8) throw new ErrorHttp(400, "La contraseña debe tener al menos 8 caracteres");

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      "INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre, email, rol",
      [nombre, correo, hash]
    );
    res.status(201).json(respuestaSesion(rows[0]));
  } catch (err) {
    if (err.code === "23505") throw new ErrorHttp(409, "Ese correo ya está registrado");
    throw err;
  }
}));

router.post("/login", asincrono(async (req, res) => {
  const correo = validar.email(req.body.email);
  const password = validar.texto(req.body.password, "La contraseña", { max: 100 });
  const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [correo]);
  // Mismo mensaje si el correo no existe o la contraseña falla, para no revelar cuentas
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
    throw new ErrorHttp(401, "Correo o contraseña incorrectos");
  }
  res.json(respuestaSesion(rows[0]));
}));

module.exports = router;
