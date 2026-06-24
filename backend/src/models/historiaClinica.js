const pool = require('../db/pool');

const JSONB_FIELDS = new Set(['app_datos', 'medicamentos_actuales', 'trat_prev_faciales', 'trat_prev_corporales']);

const HistoriaClinica = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      'SELECT * FROM historias_clinicas WHERE paciente_id = $1',
      [pacienteId]
    );
    return rows[0] || null;
  },

  async upsert(pacienteId, data, userId) {
    // Garantiza que el registro exista antes de actualizar
    await pool.query(
      'INSERT INTO historias_clinicas (paciente_id, created_by) VALUES ($1, $2) ON CONFLICT (paciente_id) DO NOTHING',
      [pacienteId, userId]
    );

    const campos = [
      // AHF
      'ah_diabetes','ah_cardiopatias','ah_hematologicas','ah_hipertension',
      'ah_nefropatias','ah_oncologicos','ah_endocrinologicas','ah_otras','ah_otras_texto',
      'ah_autoinmunes','ah_psiquiatricas_fam','ah_alergias_graves','ah_alopecia_heredit',
      'ah_ninguna_conocida',
      // APP
      'app_datos',
      // Medicamentos
      'medicamentos_actuales','alergias_texto',
      // APNP
      'ejercicio','ingesta_agua','alimentacion','trastornos_alim','apetito',
      'antojos','nivel_energia','nivel_motivacion',
      'ejercicio_tipo','ejercicio_frecuencia','ejercicio_duracion','ejercicio_intensidad',
      'horas_sueno','calidad_sueno','nivel_estres','tabaco','alcohol','otras_sustancias',
      // Gineco-obstétricos
      'menarca','fum','ritmo_menstrual','gesta','partos','abortos','cesareas',
      'complicaciones_emb','mac',
      // Motivo de consulta
      'mc_motivo_texto',
      'mc_envejecimiento','mc_manchas','mc_flacidez_facial','mc_perdida_volumen',
      'mc_acne','mc_cicatrices_acne','mc_poros','mc_deshidratacion','mc_textura',
      'mc_grasa_localizada','mc_celulitis','mc_estrias','mc_flacidez','mc_adiposidad',
      'mc_perdida_peso','mc_control_metabolico','mc_obesidad','mc_hiperpigmentacion',
      'mc_alopecia','mc_bienestar','mc_armonizacion','mc_depilacion','mc_mejora_piel',
      'mc_especifique',
      // Tratamientos previos
      'trat_prev_faciales','trat_prev_corporales','trat_prev_capilares','cirugias_esteticas',
      // Exploración física
      'fitzpatrick','glogau','tipo_rostro','tipo_piel','lesiones_derm','tipo_lesion','localizacion',
      'habitus_exterior','lesiones_descripcion','observaciones_generales',
      'sv_fc','sv_fr','sv_ta','sv_temperatura','sv_saturacion','sv_peso','sv_talla','sv_imc',
      'med_cintura','med_cadera','med_muslo','med_brazo',
      // Piel (legacy)
      'piel_limpieza','piel_hidratacion','piel_proteccion_solar','piel_rutina_noche',
      'piel_desmaquillar','piel_exposicion_sol','piel_retoque_protector','piel_tiempo_dedicado',
      'procedimiento_realizar',
      // Ninguna checks
      'app_ninguna','med_ninguno','apnp_ninguna','gineco_ninguna','trat_prev_ninguno',
    ];

    const valores = [];
    const sets = [];
    let i = 1;
    for (const campo of campos) {
      if (data[campo] !== undefined) {
        sets.push(`${campo} = $${i}`);
        const val = JSONB_FIELDS.has(campo) && data[campo] !== null && typeof data[campo] === 'object'
          ? JSON.stringify(data[campo])
          : data[campo];
        valores.push(val);
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
