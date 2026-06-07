const pool = require('../db/pool');

const HistoriaClinica = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      'SELECT * FROM historias_clinicas WHERE paciente_id = $1',
      [pacienteId]
    );
    return rows[0] || null;
  },

  async upsert(pacienteId, data, userId) {
    const campos = [
      'ah_diabetes','ah_cardiopatias','ah_hematologicas','ah_hipertension',
      'ah_nefropatias','ah_oncologicos','ah_endocrinologicas','ah_otras','ah_otras_texto',
      'app_datos',
      'ejercicio','ingesta_agua','alimentacion','trastornos_alim','apetito',
      'antojos','nivel_energia','nivel_motivacion',
      'menarca','fum','ritmo_menstrual','gesta','partos','abortos','cesareas',
      'complicaciones_emb','mac',
      'piel_limpieza','piel_hidratacion','piel_proteccion_solar','piel_rutina_noche',
      'piel_desmaquillar','piel_exposicion_sol','piel_retoque_protector','piel_tiempo_dedicado',
      'mc_envejecimiento','mc_estrias','mc_deshidratacion','mc_adiposidad',
      'mc_hiperpigmentacion','mc_obesidad','mc_acne','mc_flacidez','mc_especifique',
      'trat_prev_faciales','trat_prev_corporales',
      'fitzpatrick','glogau','tipo_rostro','tipo_piel','lesiones_derm','tipo_lesion','localizacion',
      'sv_fc','sv_fr','sv_ta','sv_temperatura','sv_saturacion','sv_peso','sv_talla','sv_imc',
      'med_cintura','med_cadera','med_muslo','med_brazo',
      'procedimiento_realizar'
    ];

    const valores = [];
    const sets = [];
    let i = 1;
    for (const campo of campos) {
      if (data[campo] !== undefined) {
        sets.push(`${campo} = $${i}`);
        valores.push(data[campo]);
        i++;
      }
    }
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      const { rows } = await pool.query(
        'SELECT * FROM historias_clinicas WHERE paciente_id = $1', [pacienteId]
      );
      return rows[0];
    }

    valores.push(pacienteId);
    const { rows } = await pool.query(
      `UPDATE historias_clinicas SET ${sets.join(', ')} WHERE paciente_id = $${i} RETURNING *`,
      valores
    );
    return rows[0];
  },
};

module.exports = HistoriaClinica;
