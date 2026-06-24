import { useState, useEffect } from 'react';
import { getDocsByPaciente, createDoc, updateDoc, deleteDoc } from '../api/documentosClinicos';

// ── helpers ──────────────────────────────────────────────────────────────────
const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm';
const bStyle   = { borderColor: 'var(--color-primary)' };

function TI({ value, onChange, placeholder, ...rest }) {
  return <input type="text" value={value || ''} placeholder={placeholder || ''}
    onChange={e => onChange(e.target.value)} className={inputCls} style={bStyle} {...rest} />;
}
function TA({ value, onChange, rows = 2 }) {
  return <textarea rows={rows} value={value || ''} onChange={e => onChange(e.target.value)}
    className={inputCls} style={bStyle} />;
}
function Field({ label, children, span2 }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
function SubHead({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4 first:mt-0"
    style={{ color: 'var(--color-accent)' }}>{children}</p>;
}
function CB({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)}
        className="accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}
function RadioGroup({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="radio" checked={value === opt.value} onChange={() => onChange(opt.value)}
            className="accent-[var(--color-accent)]" />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ── Tipos de documentos ───────────────────────────────────────────────────────
const TIPOS = [
  { key: 'val_01',   label: 'VAL-01 · Valoración Facial',           group: 'Valoraciones' },
  { key: 'val_01b',  label: 'VAL-01B · Análisis de Piel',           group: 'Valoraciones' },
  { key: 'val_02',   label: 'VAL-02 · Valoración Corporal',         group: 'Valoraciones' },
  { key: 'val_03',   label: 'VAL-03 · Valoración Capilar',          group: 'Valoraciones' },
  { key: 'val_04',   label: 'VAL-04 · Control de Peso',             group: 'Valoraciones' },
  { key: 'val_05',   label: 'VAL-05 · Medicina Funcional/Regenerativa', group: 'Valoraciones' },
  { key: 'hist_lax', label: 'HIST-LAX · Pre-Aparatología/Láser',    group: 'Valoraciones' },
  { key: 'proc_01',  label: 'PROC-01 · Toxina Botulínica',          group: 'Procedimientos' },
  { key: 'proc_02',  label: 'PROC-02 · Rellenos HA / Armonización', group: 'Procedimientos' },
  { key: 'proc_03',  label: 'PROC-03 · Skin Boosters / Mesoterapia',group: 'Procedimientos' },
  { key: 'bit_01',   label: 'BIT-01 · Depilación Láser',            group: 'Bitácoras' },
  { key: 'bit_02',   label: 'BIT-02 · HIFU / Endolift / RF',        group: 'Bitácoras' },
  { key: 'bit_03',   label: 'BIT-03 · Mesoterapia',                 group: 'Bitácoras' },
  { key: 'bit_04',   label: 'BIT-04 · Control de Peso / Tirzepatida', group: 'Bitácoras' },
  { key: 'bit_05',   label: 'BIT-05 · Sueroterapia',                group: 'Bitácoras' },
  { key: 'int_01',   label: 'INT-01 · Nota de Interconsulta',       group: 'Interconsultas' },
  { key: 'int_02',   label: 'INT-02 · Respuesta de Interconsulta',  group: 'Interconsultas' },
];

// ── Formularios por tipo ──────────────────────────────────────────────────────

function FormVal01({ d, set }) {
  const tercios = ['Superior — frente / cejas', 'Medio — cejas / base nariz', 'Inferior — base nariz / mentón'];
  const zonas = ['Frente','Entrecejo / Glabela','Región periocular Der / Izq','Pómulo Der / Izq',
    'Mejilla Der / Izq','Surco nasogeniano Der / Izq','Labio superior / Inferior',
    'Comisura labial Der / Izq','Mentón','Mandíbula Der / Izq','Cuello / Papada','Nariz'];
  const trc = d.tercios || {};
  const znz = d.zonas || {};
  const setTercio = (t, f, v) => set('tercios', { ...trc, [t]: { ...(trc[t] || {}), [f]: v } });
  const setZona   = (z, f, v) => set('zonas',   { ...znz, [z]: { ...(znz[z] || {}), [f]: v } });
  return (
    <div>
      <SubHead>Análisis por tercios faciales</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Tercio','Hallazgo principal','Tratamiento sugerido','Prioridad'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{tercios.map((t, i) => (
            <tr key={t} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium w-48">{t}</td>
              {['hallazgo','tratamiento','prioridad'].map(f => (
                <td key={f} className="px-2 py-1">
                  <TI value={trc[t]?.[f]} onChange={v => setTercio(t, f, v)} />
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <SubHead>Evaluación por zonas</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Zona','Hallazgo','Laxitud /5','Volumen /5','Arrugas /5','Objetivo'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{zonas.map((z, i) => (
            <tr key={z} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium w-40">{z}</td>
              {['hallazgo','laxitud','volumen','arrugas','objetivo'].map(f => (
                <td key={f} className="px-2 py-1">
                  <TI value={znz[z]?.[f]} onChange={v => setZona(z, f, v)} placeholder={f.includes('itud')||f.includes('umen')||f.includes('rrug')? '1-5':''} />
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <SubHead>Plan de tratamiento facial</SubHead>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Diagnóstico principal" span2><TA value={d.diagnostico} onChange={v=>set('diagnostico',v)} /></Field>
        <Field label="Tratamientos propuestos" span2><TA value={d.tratamientos_propuestos} onChange={v=>set('tratamientos_propuestos',v)} /></Field>
        <Field label="Sesiones estimadas / frecuencia"><TI value={d.sesiones} onChange={v=>set('sesiones',v)} /></Field>
        <Field label="Pronóstico"><TI value={d.pronostico} onChange={v=>set('pronostico',v)} /></Field>
      </div>
    </div>
  );
}

function FormVal01b({ d, set }) {
  const cbs = (section, items) => (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {items.map(item => <CB key={item} checked={d[section]?.[item]} label={item}
        onChange={v => set(section, { ...(d[section]||{}), [item]: v })} />)}
    </div>
  );
  return (
    <div>
      <SubHead>Clasificación cutánea general</SubHead>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Tipo de piel</p>
          {cbs('tipo_piel', ['Seca','Normal','Mixta','Grasa','Muy grasa'])}
          <p className="text-xs font-medium text-gray-600 mb-1">Sensibilidad</p>
          {cbs('sensibilidad', ['No sensible','Levemente sensible','Sensible','Muy reactiva'])}
        </div>
        <div>
          <Field label="Tono de piel"><TI value={d.tono_piel} onChange={v=>set('tono_piel',v)} /></Field>
          <Field label="Tipo de rostro"><TI value={d.tipo_rostro} onChange={v=>set('tipo_rostro',v)} /></Field>
          <Field label="Lesiones previas conocidas"><TI value={d.lesiones_previas} onChange={v=>set('lesiones_previas',v)} /></Field>
        </div>
      </div>
      <SubHead>Textura, poros y superficie</SubHead>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Textura</p>
          {cbs('textura', ['Muy fina','Fina','Normal','Gruesa','Irregular / áspera'])}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Poros</p>
          {cbs('poros', ['Imperceptibles','Visibles (finos)','Dilatados','Muy dilatados'])}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Elasticidad</p>
          {cbs('elasticidad', ['Muy buena','Buena','Moderada','Reducida','Muy reducida'])}
          <p className="text-xs font-medium text-gray-600 mb-1 mt-2">Laxitud</p>
          {cbs('laxitud', ['Ausente','Leve','Moderada','Severa'])}
        </div>
      </div>
      <SubHead>Hidratación y barrera cutánea</SubHead>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Estado de hidratación</p>
          {cbs('hidratacion', ['Muy deshidratada','Deshidratada','Normal','Bien hidratada'])}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Seborrea</p>
          {cbs('seborrea', ['Ausente','Leve (zona T)','Moderada','Severa (generalizada)'])}
        </div>
      </div>
      <SubHead>Pigmentación y manchas</SubHead>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Tipo de mancha</p>
          {cbs('tipo_mancha', ['Melasma (hormonal)','Léntigos solares','Post-inflamatoria (PIH)','Efélides / pecas','Fotoenvejecimiento difuso','Hiperpigmentación post-acné','Otra'])}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Intensidad</p>
          {cbs('intensidad_manchas', ['Muy leve','Leve','Moderada','Severa','Muy severa'])}
        </div>
      </div>
      <Field label="Descripción de manchas" span2><TA value={d.desc_manchas} onChange={v=>set('desc_manchas',v)} /></Field>
      <SubHead>Acné y lesiones activas</SubHead>
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Grado de acné</p>
        {cbs('acne', ['Ausente','Grado I (comedones)','Grado II (pápulas)','Grado III (pústulas)','Grado IV (nódulos)'])}
      </div>
      <SubHead>Cicatrices</SubHead>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Tipo</p>
          {cbs('tipo_cicatriz', ['Atróficas / cráteres','Hipertróficas','Queloides','Post-quirúrgicas','Post-traumáticas'])}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Grado</p>
          {cbs('grado_cicatriz', ['Ausentes','Leve','Moderado','Severo'])}
        </div>
      </div>
      <SubHead>Arrugas dinámicas y estáticas</SubHead>
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Arrugas dinámicas (con movimiento)</p>
        {cbs('arrugas_dinamicas', ['Frontales horizontales','Entrecejo / Glabela (11s)','Patas de gallo','Nasales (bunny lines)','Depresores ángulo oral','Peribucal / labio','Cuello / platisma','Mentón (piel de naranja)'])}
      </div>
      <SubHead>Eritema y vascularización</SubHead>
      <div className="mb-3">
        {cbs('eritema', ['Ausente','Grado I — eritema leve','Grado II — pápulas + eritema','Grado III — pústulas'])}
        {cbs('alt_vasculares', ['Telangiectasias','Cuperosis','Angiomas / puntos rubí','Capilares visibles'])}
      </div>
      <SubHead>Diagnóstico cutáneo</SubHead>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Diagnóstico cutáneo principal" span2><TA value={d.diagnostico_cutaneo} onChange={v=>set('diagnostico_cutaneo',v)} /></Field>
        <Field label="Objetivo principal"><TI value={d.objetivo_piel} onChange={v=>set('objetivo_piel',v)} /></Field>
        <Field label="Plan / protocolo sugerido"><TA value={d.plan_piel} onChange={v=>set('plan_piel',v)} /></Field>
      </div>
    </div>
  );
}

function FormVal02({ d, set }) {
  const MEDIDAS = ['Cuello','Pecho / Busto','Cintura','Abdomen (umbilical)','Cadera',
    'Muslo Der','Muslo Izq','Brazo Der','Brazo Izq','Pantorrilla Der','Glúteo','Espalda'];
  const BIOIMP  = ['Peso (kg)','IMC (kg/m²)','% Grasa corporal','% Músculo','% Agua','Grasa visceral','Edad metabólica'];
  const meds = d.medidas || {};
  const bio  = d.bioimpedancia || {};
  return (
    <div>
      <SubHead>Medidas iniciales (cm)</SubHead>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {MEDIDAS.map(m => (
          <Field key={m} label={m}>
            <TI value={meds[m]} onChange={v=>set('medidas',{...meds,[m]:v})} />
          </Field>
        ))}
      </div>
      <SubHead>Bioimpedancia — composición corporal</SubHead>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {BIOIMP.map(b => (
          <Field key={b} label={b}>
            <TI value={bio[b]} onChange={v=>set('bioimpedancia',{...bio,[b]:v})} />
          </Field>
        ))}
      </div>
      <SubHead>Distribución de grasa y celulitis</SubHead>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {['Androide (manzana / abdomen)','Ginecoide (pera / cadera-muslo)','Mixto',
          'Celulitis Grado I (suave)','Celulitis Grado II (moderada)','Celulitis Grado III (severa)','Celulitis Grado IV (muy severa)'].map(item =>
          <CB key={item} checked={d.grasa?.[item]} label={item}
            onChange={v=>set('grasa',{...(d.grasa||{}),[item]:v})} />
        )}
      </div>
      <Field label="Zonas con mayor grasa localizada"><TI value={d.zonas_grasa} onChange={v=>set('zonas_grasa',v)} /></Field>
      <SubHead>Objetivos y plan</SubHead>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Peso actual (kg)"><TI value={d.peso_actual} onChange={v=>set('peso_actual',v)} /></Field>
        <Field label="Peso meta (kg)"><TI value={d.peso_meta} onChange={v=>set('peso_meta',v)} /></Field>
        <Field label="Cintura meta (cm)"><TI value={d.cintura_meta} onChange={v=>set('cintura_meta',v)} /></Field>
        <Field label="Plan corporal propuesto" span2><TA value={d.plan_corporal} onChange={v=>set('plan_corporal',v)} /></Field>
        <Field label="Sesiones / frecuencia"><TI value={d.sesiones} onChange={v=>set('sesiones',v)} /></Field>
      </div>
    </div>
  );
}

function FormVal03({ d, set }) {
  const labs = d.laboratorios || {};
  const LABS = ['Ferritina sérica','Hemoglobina / Hierro sérico','TSH / T4 libre','Vitamina D (25-OH)','Vitamina B12','Zinc sérico','Testosterona total / libre','DHEA-S'];
  return (
    <div>
      <SubHead>Tipo de alopecia</SubHead>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {['Androgenética (patrón masculino / femenino)','Efluvio telógeno difuso','Alopecia areata',
          'Alopecia frontal fibrosante','Alopecia cicatricial','Tricotilomanía','Otra'].map(item =>
          <CB key={item} checked={d.tipo_alopecia?.[item]} label={item}
            onChange={v=>set('tipo_alopecia',{...(d.tipo_alopecia||{}),[item]:v})} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Descripción / especifique"><TI value={d.desc_alopecia} onChange={v=>set('desc_alopecia',v)} /></Field>
        <Field label="Tiempo de evolución"><TI value={d.tiempo_evolucion} onChange={v=>set('tiempo_evolucion',v)} /></Field>
        <Field label="Factor desencadenante probable"><TI value={d.factor_desencadenante} onChange={v=>set('factor_desencadenante',v)} /></Field>
        <Field label="Antecedentes familiares de alopecia"><TI value={d.antec_familiares} onChange={v=>set('antec_familiares',v)} /></Field>
      </div>
      <SubHead>Clasificación de severidad</SubHead>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Hamilton-Norwood (hombres)</p>
          <RadioGroup value={d.hamilton} onChange={v=>set('hamilton',v)}
            options={['I','II','III vertex','IV','V','VI','VII'].map(x=>({value:x,label:x}))} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Ludwig (mujeres)</p>
          <RadioGroup value={d.ludwig} onChange={v=>set('ludwig',v)}
            options={['Grado I (leve)','Grado II (moderado)','Grado III (severo)'].map(x=>({value:x,label:x}))} />
        </div>
      </div>
      <SubHead>Tricoscopia — hallazgos</SubHead>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {['Folículos vacíos / dilatados','Miniaturización folicular','Fibras en signo de exclamación',
          'Eritema perifolicular','Escamas / descamación','Puntos amarillos / negros',
          'Pelos en vellus','Pelos en mosaico','Hiperpigmentación perifolicular'].map(item =>
          <CB key={item} checked={d.tricoscopia?.[item]} label={item}
            onChange={v=>set('tricoscopia',{...(d.tricoscopia||{}),[item]:v})} />
        )}
      </div>
      <Field label="Descripción detallada tricoscópica"><TA value={d.desc_tricoscopia} onChange={v=>set('desc_tricoscopia',v)} /></Field>
      <SubHead>Laboratorios capilares</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Estudio','Resultado','Valor referencia','Fecha'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{LABS.map((lab, i) => (
            <tr key={lab} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium">{lab}</td>
              {['resultado','referencia','fecha'].map(f => (
                <td key={f} className="px-2 py-1">
                  <TI value={labs[lab]?.[f]} onChange={v=>set('laboratorios',{...labs,[lab]:{...(labs[lab]||{}),[f]:v}})} />
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <SubHead>Plan de tratamiento capilar</SubHead>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Diagnóstico capilar" span2><TA value={d.diagnostico_capilar} onChange={v=>set('diagnostico_capilar',v)} /></Field>
        <Field label="Plan propuesto"><TA value={d.plan_capilar} onChange={v=>set('plan_capilar',v)} /></Field>
        <Field label="Sesiones / frecuencia"><TI value={d.sesiones} onChange={v=>set('sesiones',v)} /></Field>
      </div>
    </div>
  );
}

function FormVal04({ d, set }) {
  const labs = d.labs_metabolicos || {};
  const LABS = ['Glucosa en ayuno','HbA1c','Insulina basal / HOMA-IR','Colesterol total / LDL / HDL',
    'Triglicéridos','Perfil tiroideo (TSH / T4 libre)','Ácido úrico','Función hepática (ALT / AST)'];
  return (
    <div>
      <SubHead>Historia de peso y objetivos</SubHead>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['peso_actual','Peso actual (kg)'],['peso_minimo','Peso mínimo (adulto)'],['peso_maximo','Peso máximo'],
          ['peso_meta','Peso meta (kg)'],['imc_actual','IMC actual'],['imc_meta','IMC meta'],
          ['talla','Talla (m)'],['cintura','Cintura (cm)']].map(([k,l]) =>
          <Field key={k} label={l}><TI value={d[k]} onChange={v=>set(k,v)} /></Field>
        )}
        <Field label="¿Ha intentado bajar de peso? ¿Cómo?" span2>
          <TA value={d.intentos_peso} onChange={v=>set('intentos_peso',v)} />
        </Field>
        <Field label="Factores que dificultan el control">
          <TA value={d.factores_dificultad} onChange={v=>set('factores_dificultad',v)} />
        </Field>
      </div>
      <SubHead>Comorbilidades asociadas al peso</SubHead>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {['Diabetes mellitus tipo 2','Prediabetes / Resistencia a la insulina','Hipertensión arterial',
          'Dislipidemia','Síndrome metabólico','Hígado graso no alcohólico (HGNA)',
          'Apnea del sueño','Hipotiroidismo','SOP (síndrome de ovario poliquístico)'].map(item =>
          <CB key={item} checked={d.comorbilidades?.[item]} label={item}
            onChange={v=>set('comorbilidades',{...(d.comorbilidades||{}),[item]:v})} />
        )}
      </div>
      <SubHead>Laboratorios metabólicos</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Estudio','Resultado','Valor referencia','Fecha'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{LABS.map((lab, i) => (
            <tr key={lab} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium">{lab}</td>
              {['resultado','referencia','fecha'].map(f => (
                <td key={f} className="px-2 py-1">
                  <TI value={labs[lab]?.[f]} onChange={v=>set('labs_metabolicos',{...labs,[lab]:{...(labs[lab]||{}),[f]:v}})} />
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <SubHead>Plan de tratamiento</SubHead>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Diagnóstico / categoría de obesidad"><TI value={d.diagnostico} onChange={v=>set('diagnostico',v)} /></Field>
        <Field label="Tratamiento propuesto"><TA value={d.tratamiento_propuesto} onChange={v=>set('tratamiento_propuesto',v)} /></Field>
        <Field label="Meta a 1 mes"><TI value={d.meta_1mes} onChange={v=>set('meta_1mes',v)} /></Field>
        <Field label="Meta a 3-6 meses"><TI value={d.meta_3meses} onChange={v=>set('meta_3meses',v)} /></Field>
      </div>
    </div>
  );
}

function FormVal05({ d, set }) {
  const BIENESTAR = ['Energía y vitalidad diaria','Calidad del sueño','Estado de ánimo / salud mental',
    'Digestión / salud intestinal','Libido / función hormonal','Memoria / concentración',
    'Dolor articular o muscular','Salud de piel, cabello y uñas'];
  const LABS = ['Vitamina D (25-OH)','Vitamina B12 sérica','Folato / Ácido fólico',
    'Magnesio intracelular','Zinc sérico','Homocisteína','PCR ultrasensible','Cortisol matutino',
    'DHEA-S','Testosterona / Estradiol / Progesterona','Insulina / HOMA-IR','Test epigenético'];
  const bio = d.bienestar || {};
  const labs = d.labs_funcionales || {};
  return (
    <div>
      <SubHead>Bienestar y síntomas (calificar 1-5)</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Área','Calificación (1-5)','Síntomas / Descripción'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{BIENESTAR.map((area, i) => (
            <tr key={area} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium">{area}</td>
              <td className="px-2 py-1 w-28">
                <TI value={bio[area]?.calificacion} placeholder="1-5"
                  onChange={v=>set('bienestar',{...bio,[area]:{...(bio[area]||{}),calificacion:v}})} />
              </td>
              <td className="px-2 py-1">
                <TI value={bio[area]?.sintomas}
                  onChange={v=>set('bienestar',{...bio,[area]:{...(bio[area]||{}),sintomas:v}})} />
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <SubHead>Laboratorios funcionales</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Estudio','Resultado','Valor referencia','Fecha'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{LABS.map((lab, i) => (
            <tr key={lab} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium">{lab}</td>
              {['resultado','referencia','fecha'].map(f => (
                <td key={f} className="px-2 py-1">
                  <TI value={labs[lab]?.[f]} onChange={v=>set('labs_funcionales',{...labs,[lab]:{...(labs[lab]||{}),[f]:v}})} />
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <SubHead>Medicina regenerativa — contraindicaciones</SubHead>
      <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
        <p className="col-span-2 text-xs text-red-600 font-semibold mb-1">⚠ Marcar si la condición ESTÁ PRESENTE (contraindicación absoluta)</p>
        {['Neoplasia activa o en remisión < 5 años','Enf. autoinmune activa','Embarazo / lactancia',
          'TFG < 30 ml/min (insuf. renal grave)','Inmunodeficiencia severa','Alergia al producto'].map(item =>
          <CB key={item} checked={d.contraind_regen?.[item]} label={item}
            onChange={v=>set('contraind_regen',{...(d.contraind_regen||{}),[item]:v})} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Indicación principal para medicina regenerativa" span2>
          <TA value={d.indicacion_regen} onChange={v=>set('indicacion_regen',v)} />
        </Field>
        <Field label="Concentración / protocolo"><TI value={d.concentracion} onChange={v=>set('concentracion',v)} /></Field>
        <Field label="Sesiones / frecuencia"><TI value={d.sesiones} onChange={v=>set('sesiones',v)} /></Field>
        <Field label="Objetivos de salud y longevidad" span2><TA value={d.objetivos_longevidad} onChange={v=>set('objetivos_longevidad',v)} /></Field>
        <Field label="Plan terapéutico integral" span2><TA value={d.plan_terapeutico} onChange={v=>set('plan_terapeutico',v)} /></Field>
      </div>
    </div>
  );
}

function FormHistLax({ d, set }) {
  const CONDICIONES = [
    ['Embarazo o período de lactancia','CONTRAINDICACIÓN ABSOLUTA'],
    ['Cáncer / neoplasias activas o en tratamiento','CONTRAINDICACIÓN ABSOLUTA'],
    ['Marcapasos o implantes cardíacos activos','CONTRAINDICACIÓN ABSOLUTA para RF / HIFU'],
    ['Epilepsia','CONTRAINDICACIÓN — evaluación médica'],
    ['Historia de queloides o mala cicatrización','CONTRAINDICACIÓN para láser ablativo'],
    ['Historia de herpes simplex (brotes frecuentes)','Profilaxis antiviral previa requerida'],
    ['Medicamentos anticoagulantes','Precaución — riesgo de hematoma'],
    ['Medicamentos fotosensibles','CONTRAINDICACIÓN para láser / luz pulsada'],
    ['Implantes metálicos en zona a tratar','Contraindicado para RF / HIFU en zona'],
    ['Tatuajes en zona a tratar','Contraindicado — riesgo de quemadura'],
    ['Vitiligo en área a tratar','Precaución — puede empeorar'],
    ['Diabetes mellitus (mal controlada)','Precaución — cicatrización lenta'],
    ['Acné activo severo en zona a tratar','Contraindicado en zona activa'],
    ['Infecciones cutáneas en área a tratar','CONTRAINDICACIÓN — tratar primero'],
  ];
  const cond = d.condiciones || {};
  return (
    <div>
      <SubHead>Datos generales</SubHead>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Fototipo de piel (Fitzpatrick)"><TI value={d.fototipo} onChange={v=>set('fototipo',v)} /></Field>
        <Field label="Tono de piel (visual)"><TI value={d.tono_piel} onChange={v=>set('tono_piel',v)} /></Field>
        <Field label="Tratamiento a realizar"><TI value={d.tratamiento} onChange={v=>set('tratamiento',v)} /></Field>
        <Field label="Equipo / dispositivo"><TI value={d.equipo} onChange={v=>set('equipo',v)} /></Field>
      </div>
      <SubHead>Condiciones médicas — contraindicaciones</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Condición médica','Presente','Contraindicación / Precaución'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{CONDICIONES.map(([cond_k, precaucion], i) => (
            <tr key={cond_k} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium">{cond_k}</td>
              <td className="px-3 py-2 text-center">
                <input type="checkbox" checked={!!cond[cond_k]}
                  onChange={e=>set('condiciones',{...cond,[cond_k]:e.target.checked})}
                  className="accent-[var(--color-accent)]" />
              </td>
              <td className="px-3 py-2 text-xs text-red-600 font-medium">{precaucion}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Área a tratar"><TI value={d.area_tratar} onChange={v=>set('area_tratar',v)} /></Field>
        <Field label="Observaciones generales"><TA value={d.observaciones} onChange={v=>set('observaciones',v)} /></Field>
      </div>
    </div>
  );
}

function FormProc01({ d, set }) {
  const SUPERIOR = ['Frontal (horizontal)','Corrugador superciliar Der / Izq','Procerus',
    'Orbicular superior Der / Izq','Orbicular inferior / Pata de gallo','Nasalis (flare alar)'];
  const INFERIOR = ['DAO (depresor ángulo oral)','Mentoniano','Orbicular labial',
    'Sonrisa gingival','Masetero Der / Izq — bruxismo / perfilamiento','Platisma (cuello — bandas)',
    'Trapecio Der / Izq — Barbie botox','Axila — hiperhidrosis','Manos / Pies — hiperhidrosis',
    'Auxiliar en migraña (occipital / temporal)'];
  const mus = d.musculos || {};
  const setM = (m, f, v) => set('musculos', { ...mus, [m]: { ...(mus[m]||{}), [f]: v } });
  const MuscTable = ({ lista }) => (
    <div className="overflow-x-auto mb-3">
      <table className="w-full text-sm">
        <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
          {['Músculo / Zona','Der (U)','Izq (U)','Técnica','Observaciones'].map(c =>
            <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
        </tr></thead>
        <tbody>{lista.map((m, i) => (
          <tr key={m} className={i%2===0?'bg-white':'bg-gray-50'}>
            <td className="px-3 py-2 text-xs font-medium w-48">{m}</td>
            {['der','izq','tecnica','observaciones'].map(f => (
              <td key={f} className="px-2 py-1">
                <TI value={mus[m]?.[f]} onChange={v=>setM(m,f,v)} />
              </td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
  return (
    <div>
      <SubHead>Datos del producto</SubHead>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['producto','Producto / Marca'],['presentacion','Presentación (U totales)'],['dilucion','Dilución (SF ml / U)'],
          ['lote','No. Lote'],['fecha_apertura','Fecha de apertura del vial'],['fecha_cad','Fecha de caducidad'],['u_totales','Unidades totales en vial']].map(([k,l]) =>
          <Field key={k} label={l}><TI value={d[k]} onChange={v=>set(k,v)} /></Field>
        )}
      </div>
      <SubHead>Tercio superior</SubHead>
      <MuscTable lista={SUPERIOR} />
      <SubHead>Tercio medio e inferior / otras zonas</SubHead>
      <MuscTable lista={INFERIOR} />
      <SubHead>Cierre de sesión</SubHead>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Total unidades aplicadas"><TI value={d.u_aplicadas} onChange={v=>set('u_aplicadas',v)} /></Field>
        <Field label="Unidades restantes en vial"><TI value={d.u_restantes} onChange={v=>set('u_restantes',v)} /></Field>
        <Field label="Próxima cita"><TI value={d.proxima_cita} onChange={v=>set('proxima_cita',v)} /></Field>
        <Field label="Observaciones / complicaciones" span2><TA value={d.observaciones} onChange={v=>set('observaciones',v)} /></Field>
      </div>
    </div>
  );
}

function FormProc02({ d, set }) {
  const ZONAS = ['Labio superior — volumen / definición','Labio inferior — volumen','Vermillón / bordes / philgrum',
    'Pómulo Der — proyección','Pómulo Izq — proyección','Surco nasogeniano Der','Surco nasogeniano Izq',
    'Ojera / surco lagrimal Der','Ojera / surco lagrimal Izq','Mentón — proyección',
    'Mandíbula Der — marcaje / perfil','Mandíbula Izq — marcaje / perfil','Rinomodelación (dorso / punta)','Sien Der / Izq'];
  const zonas = d.zonas || {};
  return (
    <div>
      <SubHead>Datos del producto</SubHead>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['producto','Producto / Marca'],['concentracion','Concentración (mg/ml)'],['volumen','Volumen total (ml)'],
          ['lote','No. Lote'],['fecha_apertura','Fecha de apertura'],['fecha_cad','Fecha de caducidad'],
          ['anestesia','Anestesia utilizada'],['canula','Tipo de cánula / aguja']].map(([k,l]) =>
          <Field key={k} label={l}><TI value={d[k]} onChange={v=>set(k,v)} /></Field>
        )}
      </div>
      <SubHead>Zonas tratadas</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Zona','✔','Producto / Marca','Vol. (ml)','Técnica / Observaciones'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{ZONAS.map((z, i) => (
            <tr key={z} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium">{z}</td>
              <td className="px-3 py-2 text-center">
                <input type="checkbox" checked={!!zonas[z]?.aplicado}
                  onChange={e=>set('zonas',{...zonas,[z]:{...(zonas[z]||{}),aplicado:e.target.checked}})}
                  className="accent-[var(--color-accent)]" />
              </td>
              {['producto','volumen','tecnica'].map(f => (
                <td key={f} className="px-2 py-1">
                  <TI value={zonas[z]?.[f]} onChange={v=>set('zonas',{...zonas,[z]:{...(zonas[z]||{}),[f]:v}})} />
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Total ml aplicados"><TI value={d.ml_totales} onChange={v=>set('ml_totales',v)} /></Field>
        <Field label="Complicaciones inmediatas"><TI value={d.complicaciones} onChange={v=>set('complicaciones',v)} /></Field>
        <Field label="Próxima cita"><TI value={d.proxima_cita} onChange={v=>set('proxima_cita',v)} /></Field>
        <Field label="Indicaciones post-procedimiento" span2><TA value={d.indicaciones} onChange={v=>set('indicaciones',v)} /></Field>
      </div>
    </div>
  );
}

function FormProc03({ d, set }) {
  const TIPOS_TRAT = ['Skin Booster — PDRN Salmón (ReMedium)','Skin Booster — TKN HA3','Skin Booster — NCTF',
    'Exosomas NXO','Juvelook / Juvelook Volume','Bioestimulador — Sculptra','Bioestimulador — Radiesse',
    'Bioestimulador — Ultracol PDO','Mesoterapia facial Toskani','Mesoterapia capilar (Dermaheal HL / DR.CYJ)',
    'Mesoterapia corporal lipolítica','Otro'];
  const ZONAS = ['Cara completa (micropapular)','Cuello y escote','Área periocular / ojera',
    'Cuero cabelludo (capilar)','Abdomen (corporal)','Brazos (corporal)','Muslos / Chaparrera','Espalda (corporal)','Glúteo','Zona específica'];
  const zonas = d.zonas || {};
  return (
    <div>
      <SubHead>Tipo de tratamiento</SubHead>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {TIPOS_TRAT.map(item =>
          <CB key={item} checked={d.tipo_trat?.[item]} label={item}
            onChange={v=>set('tipo_trat',{...(d.tipo_trat||{}),[item]:v})} />
        )}
      </div>
      <SubHead>Datos del producto</SubHead>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['producto','Producto / Marca'],['dilucion','Dilución / Concentración'],['volumen','Volumen / Dosis total'],
          ['lote','No. Lote'],['fecha_apertura','Fecha de apertura'],['fecha_cad','Fecha de caducidad'],
          ['anestesia','Técnica anestésica']].map(([k,l]) =>
          <Field key={k} label={l}><TI value={d[k]} onChange={v=>set(k,v)} /></Field>
        )}
      </div>
      <SubHead>Zonas y técnica</SubHead>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {['Zona','✔','Producto','Vol. / Dosis','Técnica'].map(c =>
              <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{ZONAS.map((z, i) => (
            <tr key={z} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-medium">{z}</td>
              <td className="px-3 py-2 text-center">
                <input type="checkbox" checked={!!zonas[z]?.aplicado}
                  onChange={e=>set('zonas',{...zonas,[z]:{...(zonas[z]||{}),aplicado:e.target.checked}})}
                  className="accent-[var(--color-accent)]" />
              </td>
              {['producto','volumen','tecnica'].map(f => (
                <td key={f} className="px-2 py-1">
                  <TI value={zonas[z]?.[f]} onChange={v=>set('zonas',{...zonas,[z]:{...(zonas[z]||{}),[f]:v}})} />
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Puntos / pases totales"><TI value={d.puntos_totales} onChange={v=>set('puntos_totales',v)} /></Field>
        <Field label="Reacción inmediata"><TI value={d.reaccion} onChange={v=>set('reaccion',v)} /></Field>
        <Field label="Próxima cita"><TI value={d.proxima_cita} onChange={v=>set('proxima_cita',v)} /></Field>
        <Field label="Indicaciones post-procedimiento" span2><TA value={d.indicaciones} onChange={v=>set('indicaciones',v)} /></Field>
      </div>
    </div>
  );
}

function FormBitacora({ d, set, tipo }) {
  const configs = {
    bit_01: {
      title: 'Depilación Láser',
      cols: ['#','Fecha','Fluencia (J/cm²)','Spot (mm)','Frec. (Hz)','Reacción / Resultado'],
      fields: ['fecha','fluencia','spot','frecuencia','reaccion'],
      rows: 12,
    },
    bit_02: {
      title: 'HIFU / Endolift / Radiofrecuencia',
      cols: ['#','Fecha','Zona','Profundidad / Energía','Disparos / Pasadas','Observaciones'],
      fields: ['fecha','zona','parametros','disparos','observaciones'],
      rows: 6,
    },
    bit_03: {
      title: 'Mesoterapia',
      cols: ['#','Fecha','Área','Producto / Cóctel','Dilución','Técnica','Observaciones'],
      fields: ['fecha','area','producto','dilucion','tecnica','observaciones'],
      rows: 8,
    },
    bit_04: {
      title: 'Control de Peso / Tirzepatida',
      cols: ['#','Fecha','Dosis (mg)','Vía','Peso (kg)','IMC','Cintura (cm)','EA / Síntomas'],
      fields: ['fecha','dosis','via','peso','imc','cintura','ea'],
      rows: 12,
    },
    bit_05: {
      title: 'Sueroterapia / Medicina Funcional',
      cols: ['#','Fecha','Suero / Protocolo','Componentes adicionales','Tiempo (min)','Tolerancia (1-5)','Observaciones'],
      fields: ['fecha','suero','componentes','tiempo','tolerancia','observaciones'],
      rows: 12,
    },
  };
  const cfg = configs[tipo];
  const sesiones = d.sesiones || Array.from({ length: cfg.rows }, () => ({}));
  const setSesion = (i, f, v) => {
    const next = [...sesiones];
    next[i] = { ...next[i], [f]: v };
    set('sesiones', next);
  };
  return (
    <div>
      <SubHead>{cfg.title} — Registro de sesiones</SubHead>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: 'var(--color-primary)' }}>
            {cfg.cols.map(c => <th key={c} className="text-left px-3 py-2 text-xs font-medium">{c}</th>)}
          </tr></thead>
          <tbody>{sesiones.map((ses, i) => (
            <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}>
              <td className="px-3 py-2 text-xs font-semibold text-center">{i+1}</td>
              {cfg.fields.map(f => (
                <td key={f} className="px-2 py-1">
                  <TI value={ses[f]} onChange={v=>setSesion(i,f,v)} />
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {tipo === 'bit_05' && (
        <div className="mt-4">
          <SubHead>Suero aplicado (marcar en cada sesión)</SubHead>
          <div className="grid grid-cols-2 gap-2">
            {['Power Serum — Protocolo estándar','Power Serum + NAD+ Renew','Cóctel de Myers',
              'Suero vitamínico (B + C)','Suero hidratante + electrolitos','Anti-fatiga (Glutatión)',
              'Antioxidante maestro','Belleza y cabello','Longevidad / anti-edad','Energía / rendimiento',
              'Detox metales pesados','Cognitivo','Articular','Metabólico / peso','Anti-estrés y sueño','Inmunológico'].map(item =>
              <CB key={item} checked={d.sueros?.[item]} label={item}
                onChange={v=>set('sueros',{...(d.sueros||{}),[item]:v})} />
            )}
          </div>
        </div>
      )}
      <div className="mt-4">
        <Field label="Observaciones generales">
          <TA value={d.observaciones_generales} onChange={v=>set('observaciones_generales',v)} />
        </Field>
      </div>
    </div>
  );
}

function FormInt01({ d, set }) {
  return (
    <div>
      <SubHead>Datos del médico solicitante</SubHead>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[['nombre_solicitante','Nombre del médico solicitante'],['especialidad_solicitante','Especialidad / Servicio'],
          ['cedula_solicitante','Cédula profesional'],['clinica_solicitante','Clínica / Consultorio'],
          ['tel_solicitante','Teléfono'],['email_solicitante','Correo electrónico']].map(([k,l]) =>
          <Field key={k} label={l}><TI value={d[k]} onChange={v=>set(k,v)} /></Field>
        )}
      </div>
      <SubHead>Datos del médico interconsultado</SubHead>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[['nombre_interconsultado','Nombre del especialista'],['especialidad_interconsultado','Especialidad solicitada'],
          ['institucion','Institución / Clínica'],['tel_interconsultado','Teléfono / Correo']].map(([k,l]) =>
          <Field key={k} label={l}><TI value={d[k]} onChange={v=>set(k,v)} /></Field>
        )}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Tipo de interconsulta</p>
          <RadioGroup value={d.tipo_urgencia} onChange={v=>set('tipo_urgencia',v)}
            options={['Urgente (mismo día)','Preferente (48-72 h)','Programada (electiva)'].map(x=>({value:x,label:x}))} />
        </div>
      </div>
      <SubHead>Resumen clínico</SubHead>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Diagnóstico principal GIOVAL" span2><TI value={d.diagnostico_gioval} onChange={v=>set('diagnostico_gioval',v)} /></Field>
        <Field label="Tiempo de evolución"><TI value={d.tiempo_evolucion} onChange={v=>set('tiempo_evolucion',v)} /></Field>
        <Field label="Tratamientos actuales"><TI value={d.tratamientos_actuales} onChange={v=>set('tratamientos_actuales',v)} /></Field>
        <Field label="Antecedentes de importancia" span2><TA value={d.antecedentes} onChange={v=>set('antecedentes',v)} /></Field>
        <Field label="Padecimiento actual / motivo de envío" span2><TA value={d.padecimiento_actual} onChange={v=>set('padecimiento_actual',v)} /></Field>
        <Field label="Exploración física pertinente" span2><TA value={d.exploracion_fisica} onChange={v=>set('exploracion_fisica',v)} /></Field>
        <Field label="Lo que se solicita al especialista" span2><TA value={d.pregunta_clinica} onChange={v=>set('pregunta_clinica',v)} /></Field>
        <Field label="Diagnóstico de envío / CIE-10" span2><TI value={d.diagnostico_envio} onChange={v=>set('diagnostico_envio',v)} /></Field>
      </div>
    </div>
  );
}

function FormInt02({ d, set }) {
  return (
    <div>
      <SubHead>Datos del especialista que responde</SubHead>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[['nombre_especialista','Nombre del especialista'],['especialidad','Especialidad'],
          ['cedula','Cédula profesional'],['institucion','Institución / Clínica'],
          ['tel','Teléfono / Correo'],['fecha_valoracion','Fecha de valoración']].map(([k,l]) =>
          <Field key={k} label={l}><TI value={d[k]} onChange={v=>set(k,v)} /></Field>
        )}
      </div>
      <SubHead>Hallazgos y diagnóstico</SubHead>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Hallazgos de la valoración especializada" span2><TA value={d.hallazgos} onChange={v=>set('hallazgos',v)} /></Field>
        <Field label="Diagnóstico principal"><TI value={d.diagnostico_principal} onChange={v=>set('diagnostico_principal',v)} /></Field>
        <Field label="Código CIE-10"><TI value={d.cie10} onChange={v=>set('cie10',v)} /></Field>
        <Field label="Diagnósticos secundarios" span2><TI value={d.diagnosticos_secundarios} onChange={v=>set('diagnosticos_secundarios',v)} /></Field>
      </div>
      <SubHead>Recomendaciones y plan</SubHead>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tratamiento recomendado" span2><TA value={d.tratamiento_recomendado} onChange={v=>set('tratamiento_recomendado',v)} /></Field>
        <Field label="Indicaciones para el médico solicitante" span2><TA value={d.indicaciones_medico} onChange={v=>set('indicaciones_medico',v)} /></Field>
        <div className="col-span-2">
          <p className="text-xs font-medium text-gray-600 mb-1">¿Compatible el tratamiento estético?</p>
          <RadioGroup value={d.compatible_estetico} onChange={v=>set('compatible_estetico',v)}
            options={['Sí — continuar sin cambios','Sí — con precauciones','No — suspender hasta nuevo aviso'].map(x=>({value:x,label:x}))} />
        </div>
        <Field label="Precauciones / restricciones" span2><TA value={d.precauciones} onChange={v=>set('precauciones',v)} /></Field>
      </div>
    </div>
  );
}

const FORM_MAP = {
  val_01: FormVal01, val_01b: FormVal01b, val_02: FormVal02, val_03: FormVal03,
  val_04: FormVal04, val_05: FormVal05, hist_lax: FormHistLax,
  proc_01: FormProc01, proc_02: FormProc02, proc_03: FormProc03,
  bit_01: d => <FormBitacora {...d} tipo="bit_01" />,
  bit_02: d => <FormBitacora {...d} tipo="bit_02" />,
  bit_03: d => <FormBitacora {...d} tipo="bit_03" />,
  bit_04: d => <FormBitacora {...d} tipo="bit_04" />,
  bit_05: d => <FormBitacora {...d} tipo="bit_05" />,
  int_01: FormInt01, int_02: FormInt02,
};

// ── Modal de edición/creación ─────────────────────────────────────────────────
function DocModal({ pacienteId, tipo, doc, onClose, onSaved }) {
  const [datos, setDatos] = useState(doc?.datos || {});
  const [fecha, setFecha] = useState(doc?.fecha?.slice(0,10) || new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tipoInfo = TIPOS.find(t => t.key === tipo);

  const set = (k, v) => setDatos(prev => ({ ...prev, [k]: v }));

  async function handleSave() {
    setLoading(true); setError('');
    try {
      if (doc?.id) {
        await updateDoc(doc.id, { datos, fecha });
      } else {
        await createDoc({ paciente_id: pacienteId, tipo, fecha, datos });
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  const FormComp = FORM_MAP[tipo];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-4">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-sage)' }}>
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--color-dark)' }}>{tipoInfo?.label}</h2>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)}
              className="mt-1 text-sm border rounded-lg px-2 py-1" style={bStyle} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {FormComp && (
            typeof FormComp === 'function' && FormComp.length > 0
              ? <FormComp d={datos} set={set} />
              : FormComp({ d: datos, set })
          )}
        </div>
        {error && <p className="px-5 text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--color-sage)' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg"
            style={{ borderColor: 'var(--color-sage)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={loading}
            className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)' }}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab principal ─────────────────────────────────────────────────────────────
export default function DocumentosClinicosTab({ pacienteId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { tipo, doc? }
  const [confirmDel, setConfirmDel] = useState(null);
  const rol = localStorage.getItem('rol');

  async function cargar() {
    setLoading(true);
    try { setDocs(await getDocsByPaciente(pacienteId)); }
    catch { setDocs([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [pacienteId]);

  async function handleDelete(id) {
    await deleteDoc(id);
    setConfirmDel(null);
    cargar();
  }

  const groups = ['Valoraciones','Procedimientos','Bitácoras','Interconsultas'];
  const docsByTipo = {};
  docs.forEach(d => { if (!docsByTipo[d.tipo]) docsByTipo[d.tipo] = []; docsByTipo[d.tipo].push(d); });

  if (loading) return <p className="text-sm text-gray-400 mt-4">Cargando documentos…</p>;

  return (
    <div>
      {groups.map(group => {
        const tiposGrupo = TIPOS.filter(t => t.group === group);
        return (
          <div key={group} className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-accent)' }}>
              {group}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {tiposGrupo.map(tipo => {
                const lista = docsByTipo[tipo.key] || [];
                return (
                  <div key={tipo.key} className="bg-white rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--color-sage)' }}>
                    <div className="flex items-center justify-between px-4 py-3"
                      style={{ backgroundColor: 'var(--color-primary)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>{tipo.label}</p>
                      {(rol === 'admin' || rol === 'asistente_medico') && (
                        <button onClick={() => setModal({ tipo: tipo.key, doc: null })}
                          className="text-xs px-3 py-1 text-white rounded-lg"
                          style={{ backgroundColor: 'var(--color-accent)' }}>
                          + Nuevo
                        </button>
                      )}
                    </div>
                    {lista.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-gray-400">Sin registros</p>
                    ) : (
                      <div className="divide-y" style={{ borderColor: 'var(--color-sage)' }}>
                        {lista.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--color-dark)' }}>
                                {new Date(doc.fecha).toLocaleDateString('es-MX', { dateStyle: 'long' })}
                              </p>
                              {doc.creado_por_nombre && (
                                <p className="text-xs text-gray-400">{doc.creado_por_nombre}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setModal({ tipo: tipo.key, doc })}
                                className="text-xs px-3 py-1 border rounded-lg"
                                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-dark)' }}>
                                Ver / Editar
                              </button>
                              {rol === 'admin' && (
                                <button onClick={() => setConfirmDel(doc.id)}
                                  className="text-xs px-3 py-1 border rounded-lg text-red-400 border-red-200 hover:bg-red-50">
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {modal && (
        <DocModal
          pacienteId={pacienteId}
          tipo={modal.tipo}
          doc={modal.doc}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar(); }}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="text-sm font-medium mb-4">¿Eliminar este documento?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm border rounded-lg">Cancelar</button>
              <button onClick={() => handleDelete(confirmDel)}
                className="px-4 py-2 text-sm text-white rounded-lg bg-red-500">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
