// Error con código HTTP para responder al cliente con un mensaje claro
class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Permite usar async/await en las rutas sin try/catch en cada una
const asincrono = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function noEncontrado(req, res) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  if (err instanceof ErrorHttp) return res.status(err.estado).json({ error: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido" });
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}

module.exports = { ErrorHttp, asincrono, noEncontrado, manejadorErrores };
