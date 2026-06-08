-- backend/src/db/migrations/017_roles_nom024.sql
-- Migración 017: Roles NOM-024, cédula profesional y tipo de nota

-- 1. Actualizar constraint de roles (primero eliminar el existente)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'asistente_medico', 'cosmetista', 'asistente_general'));

-- 2. Cédula profesional del usuario (requerida NOM-024 para médicos)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cedula_profesional VARCHAR(20);

-- 3. Migrar valor 'asistente' existente a 'asistente_medico'
UPDATE usuarios SET rol = 'asistente_medico' WHERE rol = 'asistente';

-- 4. Tipo de nota de visita
ALTER TABLE notas_visita ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'medico';
ALTER TABLE notas_visita ADD CONSTRAINT notas_visita_tipo_check
  CHECK (tipo IN ('medico', 'cosmetico'));
