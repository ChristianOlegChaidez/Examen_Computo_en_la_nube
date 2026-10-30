-- Datos iniciales. Las imágenes son nombres de archivo; la API les antepone S3_BASE_URL.

INSERT INTO categorias (nombre) VALUES ('Salas'), ('Comedor');

INSERT INTO productos (nombre, descripcion, precio, precio_anterior, stock, categoria_id, imagenes, medidas, nuevo) VALUES
('Sofá Cima 3 plazas', 'Sofá de tres plazas con respaldo cómodo y brazos anchos. Las fundas se quitan y se lavan en casa.', 9999, 10699, 8, 1,
  ARRAY['sala-sofa-1.jpg','sala-sofa-2.jpg','sala-sofa-3.jpg'], ARRAY['3 asientos','Fundas lavables'], TRUE),
('Sillón de madera curvada', 'Sillón de estructura flexible que se mece con suavidad. Ideal para leer o descansar en la esquina de la sala.', 2999, 3199, 12, 1,
  ARRAY['sala-sillon-1.jpg','sala-sillon-2.jpg','sala-sillon-3.jpg'], ARRAY['Chapa de abedul','Cojín desmontable'], FALSE),
('Mesa de centro 90 cm', 'Mesa de centro ligera con superficie fácil de limpiar. Se mueve sola entre sofá y sillón.', 899, 969, 20, 1,
  ARRAY['sala-mesa-centro-1.jpg','sala-mesa-centro-2.jpg','sala-mesa-centro-3.jpg'], ARRAY['90 × 55 cm','Efecto roble'], TRUE),
('Librero 80 × 202 cm', 'Librero alto con repisas que cambian de altura según el tamaño de tus libros y objetos.', 2999, 3199, 10, 1,
  ARRAY['sala-librero-1.jpg','sala-librero-2.jpg','sala-librero-3.jpg'], ARRAY['80 × 28 × 202 cm','Repisas ajustables'], FALSE),
('Mesa extensible 120/180 cm', 'Mesa que crece cuando llegan visitas. Se extiende con una hoja plegable guardada bajo el tablero.', 3999, 4299, 6, 2,
  ARRAY['comedor-mesa-1.jpg','comedor-mesa-2.jpg','comedor-mesa-3.jpg'], ARRAY['120 a 180 × 74 cm','Para 4 a 6 personas'], FALSE),
('Silla de madera Cima', 'Silla de comedor con estructura de madera maciza y respaldo que acompaña la espalda en comidas largas.', 2599, 2799, 24, 2,
  ARRAY['comedor-silla-1.jpg','comedor-silla-2.jpg','comedor-silla-3.jpg'], ARRAY['Madera maciza','Respaldo cómodo'], TRUE),
('Vitrina de vidrio 80 cm', 'Vitrina con puertas de vidrio y repisas para vajilla, copas y recuerdos. Se ve el contenido sin abrirla.', 4999, 5349, 5, 2,
  ARRAY['comedor-vitrina-1.jpg','comedor-vitrina-2.jpg','comedor-vitrina-3.jpg'], ARRAY['80 × 37 × 120 cm','Puertas de vidrio'], FALSE),
('Banco alto para barra', 'Banco alto para barra o isla de cocina. Tiene descansapiés para sentarse con comodidad.', 1499, 1599, 16, 2,
  ARRAY['comedor-banco-1.jpg','comedor-banco-2.jpg','comedor-banco-3.jpg'], ARRAY['Asiento a 62 cm','Con descansapiés'], FALSE);
