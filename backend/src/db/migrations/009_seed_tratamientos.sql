INSERT INTO tratamientos (nombre, duracion_min) VALUES
  ('Limpieza facial', 60),
  ('Tratamiento antienvejecimiento', 90),
  ('Micropigmentación de cejas', 120),
  ('Depilación láser', 45),
  ('Botox', 30),
  ('Relleno dérmico', 45),
  ('Peeling químico', 60),
  ('Hidratación profunda', 75),
  ('Masaje facial', 45),
  ('Consulta médica', 30)
ON CONFLICT (nombre) DO NOTHING;
