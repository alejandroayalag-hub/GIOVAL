ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN DEFAULT false;

-- Forzar cambio en cuentas no-admin (contraseña inicial Gioval2026!)
UPDATE usuarios SET debe_cambiar_password = true WHERE rol != 'admin';
