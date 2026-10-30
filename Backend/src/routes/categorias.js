const express = require("express");
const pool = require("../db/pool");
const { asincrono } = require("../middlewares/errores");

const router = express.Router();

router.get("/", asincrono(async (req, res) => {
  const { rows } = await pool.query("SELECT id, nombre FROM categorias ORDER BY id");
  res.json(rows);
}));

module.exports = router;
