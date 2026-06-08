import { useState } from 'react';
import { saveHistoria } from '../api/historiasClinicas';

// ─── AHF ─────────────────────────────────────────────────────────────────────
const AHF_ITEMS = [
  ['ah_diabetes',        'Diabetes mellitus'],
  ['ah_hipertension',    'Hipertensión arterial'],
  ['ah_cardiopatias',    'Cardiopatías'],
  ['ah_oncologicos',     'Cáncer / Oncopatías'],
  ['ah_endocrinologicas','Enf. tiroideas / endócrinas'],
  ['ah_hematologicas',   'Enf. hematológicas'],
  ['ah_autoinmunes',     'Enf. autoinmunes'],
  ['ah_nefropatias',     'Enf. renales'],
  ['ah_psiquiatricas_fam','Enf. psiquiátricas'],
  ['ah_alergias_graves', 'Alergias graves'],
  ['ah_alopecia_heredit','Alopecia hereditaria'],
  ['ah_otras',           'Otras'],
  ['ah_ninguna_conocida','Ninguna conocida'],
];

// ─── APP ─────────────────────────────────────────────────────────────────────
const APP_ITEMS = [
  { key: 'diabetes_mellitus',         label: 'Diabetes mellitus' },
  { key: 'hipertension_arterial',     label: 'Hipertensión arterial' },
  { key: 'dislipidemia',              label: 'Dislipidemia (colesterol / triglicéridos)' },
  { key: 'hipotiroidismo',            label: 'Hipotiroidismo / Hipertiroidismo' },
  { key: 'enf_autoinmunes',           label: 'Enfermedades autoinmunes' },
  { key: 'enf_dermatologicas',        label: 'Enfermedades dermatológicas crónicas' },
  { key: 'alopecia_capilar',          label: 'Alopecia / enfermedades capilares' },
  { key: 'enf_psiquiatricas',         label: 'Enf. psiquiátricas o neurológicas' },
  { key: 'cancer',                    label: 'Cáncer / oncológicas (activo o en remisión < 5 a.)' },
  { key: 'enf_cardiovasculares',      label: 'Enfermedades cardiovasculares' },
  { key: 'enf_renales',               label: 'Enfermedades renales (TFG < 30 ml/min)' },
  { key: 'epilepsia',                 label: 'Epilepsia' },
  { key: 'quirurgicos',               label: 'Quirúrgicos — cirugías previas' },
  { key: 'hospitalizaciones',         label: 'Hospitalizaciones previas' },
  { key: 'transfusiones',             label: 'Transfusiones sanguíneas' },
  { key: 'traumatismos',              label: 'Traumatismos relevantes' },
  { key: 'alergicos',                 label: 'Alergias (medicamentos, látex, alimentos)' },
  { key: 'adicciones',                label: 'Adicciones (tabaco, alcohol, sustancias)' },
];

// ─── MC ──────────────────────────────────────────────────────────────────────
const MC_ITEMS = [
  ['mc_envejecimiento',   'Envejecimiento facial'],
  ['mc_manchas',          'Manchas / hiperpigmentación'],
  ['mc_flacidez_facial',  'Flacidez facial'],
  ['mc_perdida_volumen',  'Pérdida de volumen'],
  ['mc_acne',             'Acné'],
  ['mc_cicatrices_acne',  'Cicatrices de acné'],
  ['mc_poros',            'Poros dilatados'],
  ['mc_deshidratacion',   'Deshidratación'],
  ['mc_textura',          'Textura irregular'],
  ['mc_grasa_localizada', 'Grasa localizada corporal'],
  ['mc_celulitis',        'Celulitis'],
  ['mc_estrias',          'Estrías'],
  ['mc_flacidez',         'Flacidez corporal'],
  ['mc_adiposidad',       'Adiposidad localizada'],
  ['mc_perdida_peso',     'Pérdida de peso'],
  ['mc_control_metabolico','Control metabólico'],
  ['mc_obesidad',         'Obesidad'],
  ['mc_hiperpigmentacion','Hiperpigmentación difusa'],
  ['mc_alopecia',         'Alopecia / pérdida capilar'],
  ['mc_bienestar',        'Bienestar / longevidad'],
  ['mc_armonizacion',     'Armonización / perfilamiento facial'],
  ['mc_depilacion',       'Depilación definitiva'],
  ['mc_mejora_piel',      'Mejora de calidad de piel'],
];

// ─── Tratamientos previos ─────────────────────────────────────────────────────
const TRAT_FACIALES_NAMES = [
  'Toxina botulínica',
  'Rellenos con ácido hialurónico',
  'Bioestimuladores',
  'Hilos de sustentación',
  'Peeling',
  'Microneedling / Dermapen',
  'Mesoterapia facial',
  'Otros faciales',
];
const TRAT_CORPORALES_NAMES = [
  'HIFU / Endolift / Laser Lyse',
  'Radiofrecuencia (fraccionada / monopolar)',
  'Lipolíticos inyectables (enzimas)',
  'Depilación láser',
  'Presoterapia / Drenaje linfático / Maderoterapia',
  'Otros corporales',
];

// ─── Fitzpatrick / Glogau ─────────────────────────────────────────────────────
const FITZPATRICK = [
  { num: 1, label: 'I',   desc: 'Muy clara', color: '#FDDBB4' },
  { num: 2, label: 'II',  desc: 'Clara',     color: '#F5C18B' },
  { num: 3, label: 'III', desc: 'Intermedia',color: '#E8A96A' },
  { num: 4, label: 'IV',  desc: 'Morena clara', color: '#C47F45' },
  { num: 5, label: 'V',   desc: 'Morena',    color: '#9B5E2A' },
  { num: 6, label: 'VI',  desc: 'Muy oscura',color: '#5C3010' },
];
const GLOGAU = [
  { num: 1, label: 'Tipo I',  desc: 'Sin arrugas — < 30 años' },
  { num: 2, label: 'Tipo II', desc: 'Arrugas incipientes — 30-40 a.' },
  { num: 3, label: 'Tipo III',desc: 'Arrugas en reposo — 40-60 a.' },
  { num: 4, label: 'Tipo IV', desc: 'Arrugas permanentes — > 60 a.' },
];

// ─── UI helpers ──────────────────────────────────────────────────────────────
const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm';
const bStyle   = { borderColor: 'var(--color-primary)' };

function Section({ title, open, onToggle, children, disabled = false }) {
  return (
    <div className="border rounded-xl overflow-hidden mb-3" style={{ borderColor: 'var(--color-sage)' }}>
      <button type="button" onClick={onToggle}
              className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-sm"
              style={{ backgroundColor: open ? 'var(--color-primary)' : 'white', color: 'var(--color-dark)' }}>
        <span>{title}</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <fieldset disabled={disabled} className={disabled ? 'opacity-60 pointer-events-none' : ''}>
          <div className="p-4">{children}</div>
        </fieldset>
      )}
    </div>
  );
}

function SubHead({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-2 mt-3 first:mt-0"
       style={{ color: 'var(--color-accent)' }}>
      {children}
    </p>
  );
}

function Field({ label, children, span2 = false }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TI({ value, onChange, ...rest }) {
  return (
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
           className={inputCls} style={bStyle} {...rest} />
  );
}
function TA({ value, onChange, rows = 2 }) {
  return (
    <textarea rows={rows} value={value || ''} onChange={e => onChange(e.target.value)}
              className={inputCls} style={bStyle} />
  );
}

// ─── Medications table component ──────────────────────────────────────────────
const MED_EMPTY = { medicamento: '', dosis: '', frecuencia: '', indicacion: '' };

function MedicamentosTable({ rows, onChange }) {
  const add = () => onChange([...rows, { ...MED_EMPTY }]);
  const del = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const set = (i, field, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Medicamento / Suplemento','Dosis','Frecuencia','Indicación',''].map(col => (
              <th key={col} className="text-left px-3 py-2 text-xs font-medium"
                  style={{ color: 'var(--color-dark)' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {['medicamento','dosis','frecuencia','indicacion'].map(field => (
                <td key={field} className="px-2 py-1">
                  <input type="text" value={r[field] || ''} onChange={e => set(i, field, e.target.value)}
                         className={inputCls} style={bStyle} />
                </td>
              ))}
              <td className="px-2 py-1">
                <button type="button" onClick={() => del(i)}
                        className="text-red-400 hover:text-red-600 text-xs px-2">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={add}
              className="mt-2 text-xs px-3 py-1 border rounded-lg"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
        + Agregar medicamento
      </button>
    </div>
  );
}

// ─── Previous treatments table ────────────────────────────────────────────────
function TratPrevTable({ tipo, rows, onChange }) {
  const set = (idx, field, val) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Tratamiento / Sustancia','Producto / Marca','Fecha aprox.'].map(col => (
              <th key={col} className="text-left px-3 py-2 text-xs font-medium"
                  style={{ color: 'var(--color-dark)' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-2 font-medium text-xs">{row.tratamiento}</td>
              <td className="px-2 py-1">
                <input type="text" value={row.producto || ''}
                       onChange={e => set(idx, 'producto', e.target.value)}
                       className={inputCls} style={bStyle} />
              </td>
              <td className="px-2 py-1">
                <input type="text" value={row.fecha || ''} placeholder="Ej. 2024-03"
                       onChange={e => set(idx, 'fecha', e.target.value)}
                       className={inputCls} style={bStyle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
const CAMPOS_POR_SECCION = {
  6: [
    'mc_motivo_texto', 'mc_especifique',
    'mc_envejecimiento', 'mc_manchas', 'mc_flacidez_facial', 'mc_perdida_volumen',
    'mc_acne', 'mc_cicatrices_acne', 'mc_poros', 'mc_deshidratacion', 'mc_textura',
    'mc_grasa_localizada', 'mc_celulitis', 'mc_estrias', 'mc_flacidez', 'mc_adiposidad',
    'mc_perdida_peso', 'mc_control_metabolico', 'mc_obesidad', 'mc_hiperpigmentacion',
    'mc_alopecia', 'mc_bienestar', 'mc_armonizacion', 'mc_depilacion', 'mc_mejora_piel',
  ],
  8: [
    'sv_ta', 'sv_fc', 'sv_fr', 'sv_temperatura', 'sv_saturacion',
    'sv_peso', 'sv_talla', 'sv_imc',
    'habitus_exterior', 'fitzpatrick', 'glogau',
    'tipo_piel', 'tipo_rostro', 'lesiones_derm', 'tipo_lesion',
    'lesiones_descripcion', 'observaciones_generales',
    'med_cintura', 'med_cadera', 'med_muslo', 'med_brazo',
  ],
};

export default function HistoriaClinicaForm({ pacienteId, historia: initial, onSaved, editableSections = null }) {
  const [h, setH]     = useState(initial || {});
  const [open, setOpen] = useState({ 1: true });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [ok, setOk]           = useState(false);

  const set    = (k, v) => setH(prev => ({ ...prev, [k]: v }));
  const toggle = (n)    => setOpen(prev => ({ ...prev, [n]: !prev[n] }));
  const canEdit = (n) => editableSections === null || editableSections.includes(n);

  // APP helpers
  const getApp = (key) => h.app_datos?.[key] || { tiene: false, evolucion: '' };
  const setApp = (key, field, val) =>
    set('app_datos', { ...h.app_datos, [key]: { ...getApp(key), [field]: val } });

  // Medication helpers
  const meds = Array.isArray(h.medicamentos_actuales) && h.medicamentos_actuales.length > 0
    ? h.medicamentos_actuales
    : [{ ...MED_EMPTY }];

  // Trat prev helpers
  const initTrat = (tipo, names) => {
    const existing = h[tipo];
    if (existing && existing.length > 0) return existing;
    return names.map(t => ({ tratamiento: t, producto: '', fecha: '' }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setOk(false);
    try {
      let body = { ...h, medicamentos_actuales: meds };
      if (editableSections !== null) {
        const allowedFields = editableSections.flatMap(s => CAMPOS_POR_SECCION[s] || []);
        body = Object.fromEntries(
          Object.entries(body).filter(([k]) => allowedFields.includes(k))
        );
      }
      const saved = await saveHistoria(pacienteId, body);
      setH(saved);
      setOk(true);
      if (onSaved) onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* ── 1. Antecedentes Heredofamiliares ─────────────────────────────── */}
      <Section title="HC-01 · 1. Antecedentes Heredofamiliares" open={!!open[1]} onToggle={() => toggle(1)} disabled={!canEdit(1)}>
        <p className="text-xs text-gray-400 mb-3">Familiares de primer grado</p>
        <div className="grid grid-cols-3 gap-2">
          {AHF_ITEMS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!h[k]}
                     onChange={e => set(k, e.target.checked)}
                     className="accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Field label="Especifique">
            <TI value={h.ah_otras_texto} onChange={v => set('ah_otras_texto', v)} />
          </Field>
        </div>
      </Section>

      {/* ── 2. Antecedentes Personales Patológicos ───────────────────────── */}
      <Section title="HC-01 · 2. Antecedentes Personales Patológicos" open={!!open[2]} onToggle={() => toggle(2)} disabled={!canEdit(2)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-dark)' }}>Patología / Antecedente</th>
                <th className="px-3 py-2 text-xs font-medium w-10 text-center" style={{ color: 'var(--color-dark)' }}>SÍ</th>
                <th className="px-3 py-2 text-xs font-medium w-10 text-center" style={{ color: 'var(--color-dark)' }}>NO</th>
                <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-dark)' }}>Tiempo de evolución / Tratamiento actual</th>
              </tr>
            </thead>
            <tbody>
              {APP_ITEMS.map(({ key, label }, i) => {
                const val = getApp(key);
                return (
                  <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-xs font-medium">{label}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="radio" name={key} checked={val.tiene === true}
                             onChange={() => setApp(key, 'tiene', true)}
                             className="accent-[var(--color-accent)]" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="radio" name={key} checked={!val.tiene}
                             onChange={() => setApp(key, 'tiene', false)}
                             className="accent-[var(--color-accent)]" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="text" value={val.evolucion || ''}
                             onChange={e => setApp(key, 'evolucion', e.target.value)}
                             disabled={!val.tiene}
                             placeholder={val.tiene ? 'Ej. 5 años, metformina 850 mg/día' : ''}
                             className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-400`}
                             style={bStyle} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 3. Medicamentos actuales y alergias ──────────────────────────── */}
      <Section title="HC-01 · 3. Medicamentos Actuales y Alergias" open={!!open[3]} onToggle={() => toggle(3)} disabled={!canEdit(3)}>
        <p className="text-xs text-gray-400 mb-3">
          Incluir anticoagulantes, isotretinoína, antihipertensivos, fitoterapia, suplementos.
        </p>
        <MedicamentosTable
          rows={meds}
          onChange={rows => set('medicamentos_actuales', rows)}
        />
        <div className="mt-4">
          <Field label="Alergias conocidas y tipo de reacción">
            <TA value={h.alergias_texto} onChange={v => set('alergias_texto', v)} rows={2} />
          </Field>
        </div>
      </Section>

      {/* ── 4. Antecedentes Personales No Patológicos ────────────────────── */}
      <Section title="HC-01 · 4. Antecedentes Personales No Patológicos" open={!!open[4]} onToggle={() => toggle(4)} disabled={!canEdit(4)}>
        <SubHead>Actividad física</SubHead>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de ejercicio"><TI value={h.ejercicio_tipo} onChange={v => set('ejercicio_tipo', v)} /></Field>
          <Field label="Frecuencia"><TI value={h.ejercicio_frecuencia} onChange={v => set('ejercicio_frecuencia', v)} /></Field>
          <Field label="Duración"><TI value={h.ejercicio_duracion} onChange={v => set('ejercicio_duracion', v)} /></Field>
          <Field label="Intensidad"><TI value={h.ejercicio_intensidad} onChange={v => set('ejercicio_intensidad', v)} /></Field>
        </div>

        <SubHead>Sueño y bienestar</SubHead>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Horas de sueño / día"><TI value={h.horas_sueno} onChange={v => set('horas_sueno', v)} /></Field>
          <Field label="Calidad del sueño"><TI value={h.calidad_sueno} onChange={v => set('calidad_sueno', v)} /></Field>
          <Field label="Ingesta de agua (L/día)"><TI value={h.ingesta_agua} onChange={v => set('ingesta_agua', v)} /></Field>
          <Field label="Nivel de estrés (1-10)"><TI value={h.nivel_estres} onChange={v => set('nivel_estres', v)} /></Field>
        </div>

        <SubHead>Toxicología</SubHead>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tabaco (cigarros/día / ex-fumador)"><TI value={h.tabaco} onChange={v => set('tabaco', v)} /></Field>
          <Field label="Alcohol (frecuencia / cantidad)"><TI value={h.alcohol} onChange={v => set('alcohol', v)} /></Field>
          <Field label="Otras sustancias" span2={false}><TI value={h.otras_sustancias} onChange={v => set('otras_sustancias', v)} /></Field>
        </div>

        <SubHead>Alimentación</SubHead>
        <Field label="Describir un día alimentario típico">
          <TA value={h.alimentacion} onChange={v => set('alimentacion', v)} rows={3} />
        </Field>
      </Section>

      {/* ── 5. Gineco-obstétricos ─────────────────────────────────────────── */}
      <Section title="HC-01 · 5. Antecedentes Gineco-Obstétricos" open={!!open[5]} onToggle={() => toggle(5)} disabled={!canEdit(5)}>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['menarca','Menarca'], ['fum','FUM'], ['ritmo_menstrual','Ritmo menstrual'],
            ['gesta','G (gestas)'], ['partos','P (partos)'], ['abortos','A (abortos)'], ['cesareas','C (cesáreas)'],
          ].map(([k, label]) => (
            <Field key={k} label={label}><TI value={h[k]} onChange={v => set(k, v)} /></Field>
          ))}
          <div className="col-span-3">
            <Field label="Complicaciones en los embarazos">
              <TI value={h.complicaciones_emb} onChange={v => set('complicaciones_emb', v)} />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="MAC (método anticonceptivo actual)">
              <TI value={h.mac} onChange={v => set('mac', v)} />
            </Field>
          </div>
        </div>
      </Section>

      {/* ── 6. Motivo de consulta y objetivos (HC-02) ────────────────────── */}
      <Section title="HC-02 · 6. Motivo de Consulta y Objetivos" open={!!open[6]} onToggle={() => toggle(6)} disabled={!canEdit(6)}>
        <div className="mb-4">
          <Field label="Motivo de consulta en palabras del paciente">
            <TA value={h.mc_motivo_texto} onChange={v => set('mc_motivo_texto', v)} rows={3} />
          </Field>
        </div>
        <SubHead>Objetivo principal (marcar todos los que apliquen)</SubHead>
        <div className="grid grid-cols-3 gap-2">
          {MC_ITEMS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!h[k]}
                     onChange={e => set(k, e.target.checked)}
                     className="accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Field label="Especifique otro objetivo">
            <TI value={h.mc_especifique} onChange={v => set('mc_especifique', v)} />
          </Field>
        </div>
      </Section>

      {/* ── 7. Tratamientos estéticos previos (HC-02) ────────────────────── */}
      <Section title="HC-02 · 7. Tratamientos Estéticos Previos" open={!!open[7]} onToggle={() => {
        if (!open[7]) {
          if (!h.trat_prev_faciales?.length)
            set('trat_prev_faciales', TRAT_FACIALES_NAMES.map(t => ({ tratamiento: t, producto: '', fecha: '' })));
          if (!h.trat_prev_corporales?.length)
            set('trat_prev_corporales', TRAT_CORPORALES_NAMES.map(t => ({ tratamiento: t, producto: '', fecha: '' })));
        }
        toggle(7);
      }} disabled={!canEdit(7)}>
        <SubHead>Faciales</SubHead>
        <TratPrevTable tipo="trat_prev_faciales"
                       rows={initTrat('trat_prev_faciales', TRAT_FACIALES_NAMES)}
                       onChange={rows => set('trat_prev_faciales', rows)} />

        <SubHead>Corporales y aparatología</SubHead>
        <TratPrevTable tipo="trat_prev_corporales"
                       rows={initTrat('trat_prev_corporales', TRAT_CORPORALES_NAMES)}
                       onChange={rows => set('trat_prev_corporales', rows)} />

        <SubHead>Capilares y cirugías</SubHead>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tratamiento capilar previo (producto / marca / fecha)">
            <TI value={h.trat_prev_capilares} onChange={v => set('trat_prev_capilares', v)} />
          </Field>
          <Field label="Cirugías estéticas previas">
            <TI value={h.cirugias_esteticas} onChange={v => set('cirugias_esteticas', v)} />
          </Field>
        </div>
      </Section>

      {/* ── 8. Exploración física general (HC-02) ────────────────────────── */}
      <Section title="HC-02 · 8. Exploración Física General" open={!!open[8]} onToggle={() => toggle(8)} disabled={!canEdit(8)}>
        <SubHead>Signos vitales y antropometría</SubHead>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            ['sv_ta','TA (mmHg)'], ['sv_fc','FC (lpm)'], ['sv_fr','FR (rpm)'], ['sv_temperatura','Temperatura (°C)'],
            ['sv_saturacion','SatO₂ (%)'], ['sv_peso','Peso (kg)'], ['sv_talla','Talla (m)'], ['sv_imc','IMC'],
          ].map(([k, label]) => (
            <Field key={k} label={label}><TI value={h[k]} onChange={v => set(k, v)} /></Field>
          ))}
        </div>
        <div className="mb-4">
          <Field label="Hábitus exterior">
            <TI value={h.habitus_exterior} onChange={v => set('habitus_exterior', v)} />
          </Field>
        </div>

        <SubHead>Clasificación cutánea — Fototipo Fitzpatrick</SubHead>
        <div className="flex gap-2 flex-wrap mb-4">
          {FITZPATRICK.map(f => (
            <button key={f.num} type="button" onClick={() => set('fitzpatrick', f.num)}
                    className={`flex flex-col items-center p-2 rounded-lg border-2 text-xs w-20 transition-all ${h.fitzpatrick === f.num ? 'border-[var(--color-accent)] shadow-md' : 'border-gray-200'}`}>
              <div className="w-8 h-8 rounded-full mb-1 border border-gray-300"
                   style={{ backgroundColor: f.color }} />
              <span className="font-bold">{f.label}</span>
              <span className="text-gray-500 text-center" style={{ fontSize: '10px' }}>{f.desc}</span>
            </button>
          ))}
        </div>

        <SubHead>Clasificación Glogau</SubHead>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {GLOGAU.map(g => (
            <label key={g.num} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-xs transition-all ${h.glogau === g.num ? 'border-[var(--color-accent)] bg-[var(--color-primary)]' : 'border-gray-200'}`}>
              <input type="radio" name="glogau" checked={h.glogau === g.num}
                     onChange={() => set('glogau', g.num)}
                     className="mt-0.5 accent-[var(--color-accent)]" />
              <div><span className="font-bold block">{g.label}</span>{g.desc}</div>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            ['tipo_piel','Tipo de piel'], ['tipo_rostro','Tipo de rostro'],
            ['lesiones_derm','Lesiones dermatológicas'], ['tipo_lesion','Tipo de lesión'],
          ].map(([k, label]) => (
            <Field key={k} label={label}><TI value={h[k]} onChange={v => set(k, v)} /></Field>
          ))}
          <div className="col-span-2">
            <Field label="Descripción / localización de lesiones">
              <TA value={h.lesiones_descripcion} onChange={v => set('lesiones_descripcion', v)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Observaciones generales">
              <TA value={h.observaciones_generales} onChange={v => set('observaciones_generales', v)} />
            </Field>
          </div>
        </div>

        <SubHead>Medidas en cm</SubHead>
        <div className="grid grid-cols-4 gap-3">
          {[['med_cintura','Cintura'], ['med_cadera','Cadera'], ['med_muslo','Muslo Der'], ['med_brazo','Brazo Der']].map(([k, label]) => (
            <Field key={k} label={label}><TI value={h[k]} onChange={v => set(k, v)} /></Field>
          ))}
        </div>
      </Section>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {ok    && <p className="text-green-600 text-sm mt-2">Historia clínica guardada correctamente.</p>}

      <div className="flex justify-end mt-4">
        <button type="submit" disabled={loading}
                className="px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}>
          {loading ? 'Guardando...' : 'Guardar historia clínica'}
        </button>
      </div>
    </form>
  );
}
