require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { noEncontrado, manejadorErrores } = require("./middlewares/errores");

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el archivo .env");
  process.exit(1);
}

const app = express();

// CSP: permite fotos desde cualquier https (S3) y no fuerza https, porque la EC2 puede servir por http
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:"],
      "upgrade-insecure-requests": null
    }
  }
}));
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "100kb" }));

app.use("/api/productos", require("./routes/productos"));
app.use("/api/categorias", require("./routes/categorias"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/checkout", require("./routes/checkout"));
app.use("/api/ordenes", require("./routes/ordenes"));
app.use("/api", noEncontrado);

// El mismo servidor entrega la página (Front/), así el front y la API comparten origen
const carpetaFront = path.resolve(__dirname, "..", process.env.FRONT_DIR || "../Front");
app.use(express.static(carpetaFront));

app.use(manejadorErrores);

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => console.log(`CimaMuebles escuchando en http://localhost:${puerto}`));
