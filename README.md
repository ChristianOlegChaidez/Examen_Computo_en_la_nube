# CimaMuebles

Tienda en línea de muebles. Cliente: catálogo por categorías, detalle, carrito y compra que se guarda en la base de datos. Administrador: gestión de productos y órdenes (API lista, panel pendiente).

```
Front/     Página (HTML, CSS, JS). La sirve el mismo servidor Express.
Backend/   API REST en Node.js + Express + PostgreSQL.
```

## Requisitos
- Node.js 18 o superior
- PostgreSQL 13 o superior

## Instalación
1. Crea la base de datos vacía en PostgreSQL:
   `CREATE DATABASE cimamuebles;`
2. Configura el entorno:
   ```
   cd Backend
   cp .env.example .env     # edita DATABASE_URL, JWT_SECRET y S3_BASE_URL
   npm install
   ```
3. Crea las tablas y carga los muebles de ejemplo:
   `npm run db:init`
4. Crea el usuario administrador (usa ADMIN_EMAIL y ADMIN_PASSWORD del .env):
   `npm run db:admin`
5. Arranca el servidor:
   `npm start`
6. Abre http://localhost:3000

## Fotos (S3)
La base de datos guarda solo el nombre del archivo (`sala-sofa-1.jpg`). La API le antepone `S3_BASE_URL`.
- En local, `S3_BASE_URL=/Imagenes` usa las fotos de `Front/Imagenes`.
- En AWS, las fotos están en `s3://examencncyg/Productos/`. Pon `S3_BASE_URL=https://examencncyg.s3.us-east-2.amazonaws.com/Productos`. El bucket debe permitir lectura pública de la carpeta `Productos/` (desactiva "Block public access" y agrega una bucket policy con `s3:GetObject`).

## Base de datos
| Tabla | Contenido |
|---|---|
| `categorias` | id, nombre |
| `productos` | nombre, descripción, precio, precio anterior, stock, categoría (FK), imágenes, medidas |
| `usuarios` | nombre, correo único, contraseña con hash (bcrypt), rol `cliente` o `admin` |
| `ordenes` | cliente, total, estado, usuario (FK opcional) |
| `orden_items` | orden (FK), producto (FK), cantidad, precio al momento de la compra |

Restricciones: precio y stock no pueden ser negativos, cantidad mayor a 0, correo único.

## API
| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /api/productos?categoria=&q=` | público | Catálogo con filtros |
| `GET /api/productos/:id` | público | Detalle |
| `GET /api/categorias` | público | Categorías |
| `POST /api/checkout` | público | Compra: `{nombre, email, items:[{producto_id, cantidad}]}` |
| `POST /api/auth/registro`, `/login` | público | Devuelve un token JWT |
| `POST/PUT/DELETE /api/productos` | admin | CRUD de productos |
| `GET /api/ordenes` | admin | Órdenes con sus productos |
| `PATCH /api/ordenes/:id/estado` | admin | Cambia el estado; al cancelar regresa el stock |

Las rutas de admin llevan `Authorization: Bearer <token>`.

## Lógica de compra
El checkout corre en una transacción. El servidor busca los precios en la base de datos (no confía en el navegador), descuenta el stock con `UPDATE ... WHERE stock >= cantidad` y, si algún producto no alcanza, cancela todo y responde 409 con el producto afectado.

## Despliegue en EC2
1. Instala Node.js y clona el proyecto. Configura `.env` con la base de datos y `PORT=80` (o usa nginx).
2. `npm install && npm run db:init && npm run db:admin`
3. Mantén el proceso vivo: `npm install -g pm2 && pm2 start src/app.js --name cimamuebles`
4. En el Security Group de la EC2 abre el puerto HTTP (80 o el de `PORT`). Deja cerrado el puerto de PostgreSQL al público.
5. Asigna una IP elástica a la instancia para que la dirección no cambie al reiniciar.
