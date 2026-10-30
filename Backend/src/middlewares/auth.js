const jwt = require("jsonwebtoken");
const { ErrorHttp } = require("./errores");

// Lee el token "Authorization: Bearer <token>" y deja el usuario en req.usuario
function requiereAuth(req, res, next) {
  const cabecera = req.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;
  if (!token) return next(new ErrorHttp(401, "Inicia sesión para continuar"));
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new ErrorHttp(401, "Sesión inválida o vencida"));
  }
}

function requiereAdmin(req, res, next) {
  requiereAuth(req, res, err => {
    if (err) return next(err);
    if (req.usuario.rol !== "admin") return next(new ErrorHttp(403, "Solo para administradores"));
    next();
  });
}

module.exports = { requiereAuth, requiereAdmin };
