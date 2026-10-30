const pool = require('../db/pool');
const { actualizarAvance } = require('../services/planTratamiento');
const { requisitosProcedimiento, mensajeFaltan } = require('../services/requisitosProcedimiento');
const { PAQUETE_JOIN, PAQUETE_COLS, conPaquete } = require('../services/abonos');
const { hoyMx, diaMx } = require('../utils/fecha');

const ORDEN_ESTATUS = {
  checkin: 1, en_consultorio: 2, en_procedimiento: 3,
  cierre: 4, en_caja: 5, agendada: 6, completado: 7,
};

const SIGUIENTE = {
  checkin: 'en_consultorio',
  en_consultorio: 'en_procedimiento',
  en_procedimiento: 'cierre',
  cierre: 'en_caja',
  en_caja: 'completado',
};

const HORA_CAMPO = {
  en_consultorio: 'hora_consultorio',
  en_procedimiento: 'hora_procedimiento',
  cierre: 'hora_cierre',
  en_caja: 'hora_caja',
  completado: 'hora_completado',
};

exports.hoy = async (req, res, next) => {
  try {
    const hoy = hoyMx();

    // Auto-completar flujos en_caja donde ya se cobró
    await pool.query(
      `UPDATE flujo_paciente fp
       SET estatus = 'completado', hora_completado = NOW(), updated_at = NOW()
       FROM citas c
       WHERE fp.cita_id = c.id
         AND fp.estatus = 'en_caja'
         AND c.cobrado = true
         AND ${diaMx('c.fecha_hora')} = $1`,
      [hoy]
    );

    const { rows } = await pool.query(
      `SELECT
         c.id AS cita_id,
         fp.id AS flujo_id,
         COALESCE(fp.estatus, 'agendada') AS estatus,
         c.paciente_id,
         TRIM(COALESCE(
           NULLIF(CONCAT_WS(' ',
             NULLIF(p.apellido_paterno,''), NULLIF(p.apellido_materno,''), NULLIF(p.nombre,'')), ''),
           c.nombre_paciente
         )) AS paciente_nombre,
         t.nombre AS tratamiento_nombre,
         TRIM(CONCAT(COALESCE(e.nombre,''), ' ', COALESCE(e.apellido_paterno,''))) AS empleada_nombre,
         co.nombre AS consultorio_nombre,
         fp.consultorio_id,
         c.fecha_hora,
         c.cobrado,
         c.tratamiento_id,
         c.insumos_confirmados,
         fp.hora_checkin,
         fp.hora_consultorio,
         fp.hora_procedimiento,
         fp.hora_cierre,
         fp.hora_caja,
         fp.hora_completado,
         fp.nota_visita_id,
         ${PAQUETE_COLS}
       FROM citas c
       ${PAQUETE_JOIN}
       LEFT JOIN flujo_paciente fp ON fp.cita_id = c.id
       LEFT JOIN pacientes p       ON c.paciente_id = p.id
       LEFT JOIN tratamientos t    ON c.tratamiento_id = t.id
       LEFT JOIN empleados e       ON c.empleada_id = e.id
       LEFT JOIN consultorios co   ON fp.consultorio_id = co.id
       WHERE ${diaMx('c.fecha_hora')} = $1
         AND c.estatus IN ('pendiente', 'realizada')
       ORDER BY c.fecha_hora`,
      [hoy]
    );

    const filas = rows.map(conPaquete);
    const activos = filas
      .filter(r => r.estatus !== 'completado')
      .sort((a, b) => (ORDEN_ESTATUS[a.estatus] || 99) - (ORDEN_ESTATUS[b.estatus] || 99));

    const completados = filas.filter(r => r.estatus === 'completado');

    res.json({ activos, completados });
  } catch (err) { next(err); }
};

exports.checkin = async (req, res, next) => {
  try {
    const { cita_id } = req.params;
    const { consultorio_id } = req.body;
    if (!consultorio_id) return res.status(400).json({ error: 'consultorio_id es requerido' });

    const hoy = hoyMx();
    const { rows: citas } = await pool.query(
      `SELECT id FROM citas WHERE id=$1 AND ${diaMx('fecha_hora')}=$2 AND estatus='pendiente'`,
      [cita_id, hoy]
    );
    if (!citas[0]) return res.status(404).json({ error: 'Cita no encontrada o no es de hoy' });

    const { rows: existing } = await pool.query(
      'SELECT id FROM flujo_paciente WHERE cita_id=$1', [cita_id]
    );
    if (existing[0]) return res.status(409).json({ error: 'Esta cita ya tiene check-in' });

    const { rows } = await pool.query(
      `INSERT INTO flujo_paciente (cita_id, consultorio_id, estatus, hora_checkin, created_by)
       VALUES ($1, $2, 'checkin', NOW(), $3) RETURNING *`,
      [cita_id, consultorio_id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.requisitos = async (req, res, next) => {
  try { res.json(await requisitosProcedimiento(req.params.cita_id)); } catch (err) { next(err); }
};

exports.avanzar = async (req, res, next) => {
  try {
    const { cita_id } = req.params;

    const { rows: flujos } = await pool.query(
      'SELECT * FROM flujo_paciente WHERE cita_id=$1', [cita_id]
    );
    if (!flujos[0]) return res.status(404).json({ error: 'No hay flujo para esta cita' });
    const flujo = flujos[0];

    const siguiente = SIGUIENTE[flujo.estatus];
    if (!siguiente) return res.status(400).json({ error: 'No hay siguiente estado' });

    // Bloqueo: checkin → en_consultorio requiere CI-00/01/02 firmados
    if (flujo.estatus === 'checkin') {
      const { rows: [c] } = await pool.query(
        `SELECT ci.paciente_id,
                ARRAY(SELECT g FROM unnest(ARRAY['CI-00','CI-01','CI-02']) g
                      WHERE NOT EXISTS (
                        SELECT 1 FROM consentimientos_firmados cf
                        JOIN consentimientos co ON co.id = cf.consentimiento_id
                        WHERE cf.paciente_id = ci.paciente_id AND co.codigo = g)) AS faltan
         FROM citas ci WHERE ci.id = $1`,
        [cita_id]
      );
      if (!c?.paciente_id) {
        return res.status(409).json({ error: 'Vincula la cita a un expediente y firma los consentimientos antes de pasar' });
      }
      if (c.faltan.length) {
        return res.status(409).json({
          error: `Faltan consentimientos firmados: ${c.faltan.join(', ')}`,
          paciente_id: c.paciente_id,
        });
      }
    }

    // Bloqueo: en_consultorio → en_procedimiento requiere presupuesto firmado y CI del tratamiento
    if (flujo.estatus === 'en_consultorio') {
      const req_ = await requisitosProcedimiento(cita_id);
      if (req_.faltan.length) {
        return res.status(409).json({ error: mensajeFaltan(req_.faltan), faltan: req_.faltan,
          paciente_id: req_.paciente_id, cita_id: Number(cita_id) });
      }
    }

    // Bloqueo: cierre → en_caja requiere nota SOAP
    if (flujo.estatus === 'cierre') {
      const { rows: notas } = await pool.query(
        'SELECT id FROM notas_visita WHERE cita_id=$1 LIMIT 1', [cita_id]
      );
      if (!notas[0]) {
        return res.status(409).json({ error: 'Debes completar la nota SOAP antes de continuar' });
      }
      await pool.query(
        `UPDATE flujo_paciente
         SET estatus=$1, hora_caja=NOW(), nota_visita_id=$2, updated_at=NOW()
         WHERE id=$3`,
        [siguiente, notas[0].id, flujo.id]
      );
      const { rows: [realizada] } = await pool.query(
        'UPDATE citas SET estatus=$1 WHERE id=$2 RETURNING plan_tratamiento_id', ['realizada', cita_id]);
      await actualizarAvance(realizada?.plan_tratamiento_id);
      const { rows: updated } = await pool.query('SELECT * FROM flujo_paciente WHERE id=$1', [flujo.id]);
      return res.json(updated[0]);
    }

    const campo = HORA_CAMPO[siguiente];
    const { rows } = await pool.query(
      `UPDATE flujo_paciente
       SET estatus=$1, ${campo}=NOW(), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [siguiente, flujo.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};
