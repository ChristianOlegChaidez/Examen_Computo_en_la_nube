// Crea las tablas y carga los datos iniciales: npm run db:init
const fs = require("fs");
const path = require("path");
const pool = require("./pool");

(async () => {
  try {
    for (const archivo of ["schema.sql", "seed.sql"]) {
      await pool.query(fs.readFileSync(path.join(__dirname, archivo), "utf8"));
      console.log(`OK ${archivo}`);
    }
  } catch (err) {
    console.error("Error al inicializar la base de datos:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
