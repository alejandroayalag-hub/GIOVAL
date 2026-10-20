-- 045: puesto que realiza cada tratamiento (reparto dado por Gio, 2026-10-20).
-- Al dar de alta personal con ese puesto se le asignan sus tratamientos en empleado_tratamiento.
ALTER TABLE tratamientos ADD COLUMN IF NOT EXISTS puesto VARCHAR(20);
ALTER TABLE tratamientos DROP CONSTRAINT IF EXISTS tratamientos_puesto_check;
ALTER TABLE tratamientos ADD CONSTRAINT tratamientos_puesto_check
  CHECK (puesto IN ('medico', 'cosmetologa', 'enfermera'));

-- Médico (Gio): valoraciones, medicina estética, suplementación
UPDATE tratamientos SET puesto = 'medico'
WHERE categoria LIKE '00%' OR categoria LIKE '01%'
   OR (categoria LIKE '08%' AND subcategoria = 'Suplementación Personalizada');

-- Cosmetóloga: faciales, capilares, aparatología, spa
UPDATE tratamientos SET puesto = 'cosmetologa'
WHERE categoria LIKE '02%' OR categoria LIKE '03%' OR categoria LIKE '05%' OR categoria LIKE '06%';

-- Enfermera: control de peso, medicina regenerativa, resto de medicina funcional (test, sueros, Power Serum)
UPDATE tratamientos SET puesto = 'enfermera'
WHERE categoria LIKE '04%' OR categoria LIKE '07%'
   OR (categoria LIKE '08%' AND subcategoria IS DISTINCT FROM 'Suplementación Personalizada');
