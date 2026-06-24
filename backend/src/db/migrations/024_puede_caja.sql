ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puede_caja BOOLEAN DEFAULT FALSE;
UPDATE usuarios SET puede_caja = TRUE WHERE email = 'cosmetologa2@elys.com';
