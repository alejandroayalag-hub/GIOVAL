-- 047: liga el usuario (login) con su ficha de Personal (empleados, la que aparece en la agenda).
-- Cosmetóloga / enfermera ligadas solo ven su agenda y sus pacientes (middleware/misPacientes.js).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_empleado_unico ON usuarios (empleado_id) WHERE empleado_id IS NOT NULL;
