// Crea (o actualiza) el usuario administrador con ADMIN_EMAIL y ADMIN_PASSWORD: npm run db:admin
const bcrypt = require("bcryptjs");
const pool = require("./pool");

(async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Define ADMIN_EMAIL y ADMIN_PASSWORD en el archivo .env");
    process.exit(1);
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ('Administrador', $1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = 'admin'`,
      [email.toLowerCase(), hash]
    );
    console.log(`Administrador listo: ${email}`);
  } catch (err) {
    console.error("No se pudo crear el administrador:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
