const HistoriaClinica = require('../models/historiaClinica');

// Campos que asistente_medico puede modificar (secciones 6 y 8)
const CAMPOS_ASISTENTE_MEDICO = [
  // Sección 6 — Motivo de consulta
  'mc_motivo_texto', 'mc_especifique',
  'mc_envejecimiento', 'mc_manchas', 'mc_flacidez_facial', 'mc_perdida_volumen',
  'mc_acne', 'mc_cicatrices_acne', 'mc_poros', 'mc_deshidratacion', 'mc_textura',
  'mc_grasa_localizada', 'mc_celulitis', 'mc_estrias', 'mc_flacidez', 'mc_adiposidad',
  'mc_perdida_peso', 'mc_control_metabolico', 'mc_obesidad', 'mc_hiperpigmentacion',
  'mc_alopecia', 'mc_bienestar', 'mc_armonizacion', 'mc_depilacion', 'mc_mejora_piel',
  // Sección 8 — Exploración física
  'sv_ta', 'sv_fc', 'sv_fr', 'sv_temperatura', 'sv_saturacion',
  'sv_peso', 'sv_talla', 'sv_imc',
  'habitus_exterior', 'fitzpatrick', 'glogau',
  'tipo_piel', 'tipo_rostro', 'lesiones_derm', 'tipo_lesion',
  'lesiones_descripcion', 'observaciones_generales',
  'med_cintura', 'med_cadera', 'med_muslo', 'med_brazo',
];

exports.get = async (req, res, next) => {
  try {
    const historia = await HistoriaClinica.findByPaciente(req.params.pacienteId);
    if (!historia) return res.status(404).json({ error: 'Historia clínica no encontrada' });
    res.json(historia);
  } catch (err) { next(err); }
};

exports.save = async (req, res, next) => {
  try {
    let body = req.body;
    if (req.user.rol === 'asistente_medico') {
      body = Object.fromEntries(
        Object.entries(req.body).filter(([k]) => CAMPOS_ASISTENTE_MEDICO.includes(k))
      );
    }
    const historia = await HistoriaClinica.upsert(req.params.pacienteId, body, req.user.id);
    res.json(historia);
  } catch (err) { next(err); }
};
