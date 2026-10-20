-- Notas de visita sin cita (escritas directo en el expediente)
ALTER TABLE notas_visita ALTER COLUMN cita_id DROP NOT NULL;

-- Diagnóstico en texto libre (CIE-10 opcional)
ALTER TABLE paciente_diagnosticos ALTER COLUMN cie10_codigo DROP NOT NULL;
