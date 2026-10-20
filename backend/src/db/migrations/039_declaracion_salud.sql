-- Declaración de Salud (CI-02): cuestionario + firma, como consentimiento general
ALTER TABLE consentimientos_firmados ADD COLUMN IF NOT EXISTS respuestas JSONB;

INSERT INTO consentimientos (codigo, titulo, texto_consentimiento, activo)
VALUES ('CI-02', 'Declaración de Salud',
  'Lea con atención y responda con sinceridad. Esta información es confidencial y nos permite elegir el tratamiento más seguro para usted. Si tiene dudas sobre alguna pregunta, consúltela con su médica antes de firmar.

DECLARACIÓN
Declaro bajo protesta de decir verdad que la información proporcionada en este cuestionario es completa y verídica. Entiendo que omitir o falsear datos sobre mi estado de salud, medicamentos, alergias, consumo de sustancias o tratamientos previos puede aumentar el riesgo de complicaciones o de resultados no deseados, y asumo las consecuencias que de ello se deriven. Me comprometo a informar a Gioval Medicina Estética de cualquier cambio en mi salud antes de cada sesión. Autorizo que esta información forme parte de mi expediente clínico, el cual será tratado con confidencialidad conforme a la NOM-004-SSA3-2012 y a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, según el aviso de privacidad de la clínica.',
  true)
ON CONFLICT (codigo) DO NOTHING;
