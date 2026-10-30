-- Esquema de CimaMuebles (PostgreSQL).
-- Es seguro correrlo varias veces: borra y vuelve a crear las tablas.

DROP TABLE IF EXISTS orden_items;
DROP TABLE IF EXISTS ordenes;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE categorias (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE productos (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(120) NOT NULL,
  descripcion      TEXT NOT NULL DEFAULT '',
  precio           NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  precio_anterior  NUMERIC(10,2) CHECK (precio_anterior >= 0),
  stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  categoria_id     INTEGER NOT NULL REFERENCES categorias(id),
  -- Nombres de archivo (o URLs completas) de las fotos en S3
  imagenes         TEXT[] NOT NULL DEFAULT '{}',
  medidas          TEXT[] NOT NULL DEFAULT '{}',
  nuevo            BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);

CREATE TABLE usuarios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  rol            VARCHAR(10) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ordenes (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER REFERENCES usuarios(id),  -- NULL si compró como invitado
  nombre_cliente  VARCHAR(100) NOT NULL,
  email_cliente   VARCHAR(150) NOT NULL,
  total           NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  estado          VARCHAR(15) NOT NULL DEFAULT 'pagada' CHECK (estado IN ('pagada', 'enviada', 'cancelada')),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orden_items (
  id               SERIAL PRIMARY KEY,
  orden_id         INTEGER NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  producto_id      INTEGER NOT NULL REFERENCES productos(id),
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
  -- Precio al momento de la compra, para que cambios futuros no alteren órdenes viejas
  precio_unitario  NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0)
);
CREATE INDEX idx_items_orden ON orden_items(orden_id);
