import { useState } from 'react';
import { saveHistoria } from '../api/historiasClinicas';

const APP_KEYS = [
  { key: 'diabetes_mellitus', label: 'Diabetes Mellitus' },
  { key: 'hipertension_arterial', label: 'Hipertensión arterial' },
  { key: 'alergicos', label: 'Alérgicos' },
  { key: 'transfusiones', label: 'Transfusiones sanguíneas' },
  { key: 'traumatismos', label: 'Traumatismos' },
  { key: 'hospitalizaciones', label: 'Hospitalizaciones previas' },
  { key: 'quirurgicos', label: 'Quirúrgicos' },
  { key: 'lesiones_dermatologicas', label: 'Lesiones dermatológicas' },
  { key: 'enf_endocrinas', label: 'Enf. Endócrinas' },
  { key: 'enf_psiquiatricas', label: 'Enf. Psiquiátricas' },
  { key: 'epilepsia', label: 'Epilepsia' },
  { key: 'adicciones', label: 'Adicciones' },
];

const TRAT_FACIALES = [
  'Toxina botulínica','Rellenos faciales con AH','Hilos de sustentación',
  'Peeling','Microdermoabrasión','Plasma rico en plaquetas',
  'Intradermoterapia','Micropigmentación','Radiofrecuencia','Otros',
];
const TRAT_CORPORALES = [
  'Ultra cavitación','Radiofrecuencia','Gimnasia pasiva','Carboxiterapia',
  'Intradermoterapia','Hidrolipoclasia','Crió lipólisis','Otras',
];

const FITZPATRICK = [
  { num: 1, label: 'I', desc: 'Muy blanca/rosada', color: '#FDDBB4' },
  { num: 2, label: 'II', desc: 'Clara, sensible', color: '#F5C18B' },
  { num: 3, label: 'III', desc: 'Clara/bronceada verano', color: '#E8A96A' },
  { num: 4, label: 'IV', desc: 'De oscura a morena', color: '#C47F45' },
  { num: 5, label: 'V', desc: 'De oscura a morena', color: '#9B5E2A' },
  { num: 6, label: 'VI', desc: 'Muy oscura', color: '#5C3010' },
];

const GLOGAU = [
  { num: 1, label: 'Tipo 1', desc: 'Sin arrugas · 20-30 años · inicio fotoenvejecimiento' },
  { num: 2, label: 'Tipo 2', desc: 'Arrugas expresión · 30-40 años · lentigos solares' },
  { num: 3, label: 'Tipo 3', desc: 'Arrugas en reposo · 40-60 años · manchas evidentes' },
  { num: 4, label: 'Tipo 4', desc: 'Solo arrugas · +60 años · fotoenvejecimiento severo' },
];

function Section({ title, open, onToggle, children }) {
  return (
    <div className="border rounded-xl overflow-hidden mb-3" style={{ borderColor: 'var(--color-sage)' }}>
      <button type="button" onClick={onToggle}
              className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-sm"
              style={{ backgroundColor: open ? 'var(--color-primary)' : 'white', color: 'var(--color-dark)' }}>
        <span>{title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm";
const borderStyle = { borderColor: 'var(--color-primary)' };

function TextInput({ value, onChange, ...props }) {
  return (
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
           className={inputCls} style={borderStyle} {...props} />
  );
}

function TextArea({ value, onChange, rows = 2 }) {
  return (
    <textarea rows={rows} value={value || ''}
              onChange={e => onChange(e.target.value)}
              className={inputCls} style={borderStyle} />
  );
}

export default function HistoriaClinicaForm({ pacienteId, historia: initial, onSaved }) {
  const [h, setH] = useState(initial || {});
  const [open, setOpen] = useState({ 1: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const set = (k, v) => setH(prev => ({ ...prev, [k]: v }));
  const toggle = (n) => setOpen(prev => ({ ...prev, [n]: !prev[n] }));

  const getApp = (key) => h.app_datos?.[key] || { tiene: false, evolucion: '' };
  const setApp = (key, field, val) => {
    const prev = getApp(key);
    set('app_datos', { ...h.app_datos, [key]: { ...prev, [field]: val } });
  };

  const getTratRows = (tipo, names) =>
    h[tipo]?.length > 0 ? h[tipo] : names.map(t => ({ tratamiento: t, producto: '', fecha: '' }));

  const setTratPrev = (tipo, idx, field, val) => {
    const arr = [...(h[tipo] || [])];
    arr[idx] = { ...arr[idx], [field]: val };
    set(tipo, arr);
  };

  const initTratPrev = (tipo, names) => {
    if (!h[tipo] || h[tipo].length === 0) {
      set(tipo, names.map(t => ({ tratamiento: t, producto: '', fecha: '' })));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setOk(false);
    try {
      const saved = await saveHistoria(pacienteId, h);
      setH(saved);
      setOk(true);
      if (onSaved) onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Sección 1 — Antecedentes heredofamiliares */}
      <Section title="1. Antecedentes Heredofamiliares" open={!!open[1]} onToggle={() => toggle(1)}>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['ah_diabetes','Diabetes Mellitus'], ['ah_cardiopatias','Cardiopatías'],
            ['ah_hematologicas','Ef. Hematológicas'], ['ah_hipertension','Hipertensión'],
            ['ah_nefropatias','Nefropatías'], ['ah_oncologicos','Onológicos'],
            ['ah_endocrinologicas','Enf. Endocrinológicas'], ['ah_otras','Otras'],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!h[k]}
                     onChange={e => set(k, e.target.checked)}
                     className="accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
        </div>
        {h.ah_otras && (
          <div className="mt-3">
            <Field label="Especificar otras">
              <TextInput value={h.ah_otras_texto} onChange={v => set('ah_otras_texto', v)} />
            </Field>
          </div>
        )}
      </Section>

      {/* Sección 2 — Antecedentes personales patológicos */}
      <Section title="2. Antecedentes Personales Patológicos" open={!!open[2]} onToggle={() => toggle(2)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                <th className="text-left px-3 py-2 font-medium text-xs" style={{ color: 'var(--color-dark)' }}>Patología</th>
                <th className="px-3 py-2 text-xs font-medium w-12" style={{ color: 'var(--color-dark)' }}>Sí</th>
                <th className="px-3 py-2 text-xs font-medium w-12" style={{ color: 'var(--color-dark)' }}>No</th>
                <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-dark)' }}>Tiempo de evolución / Tx actual</th>
              </tr>
            </thead>
            <tbody>
              {APP_KEYS.map(({ key, label }, i) => {
                const val = getApp(key);
                return (
                  <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 font-medium">{label}</td>
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
                    <td className="px-3 py-2">
                      <input type="text" value={val.evolucion || ''}
                             onChange={e => setApp(key, 'evolucion', e.target.value)}
                             disabled={!val.tiene}
                             placeholder={val.tiene ? 'Ej. 5 años, en control con metformina' : ''}
                             className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-400`}
                             style={borderStyle} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Sección 3 — Hábitos y estilo de vida */}
      <Section title="3. Hábitos y Estilo de Vida" open={!!open[3]} onToggle={() => toggle(3)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ejercicio (tipo, duración y frecuencia)">
            <TextInput value={h.ejercicio} onChange={v => set('ejercicio', v)} />
          </Field>
          <Field label="Ingesta de agua">
            <TextInput value={h.ingesta_agua} onChange={v => set('ingesta_agua', v)} />
          </Field>
          <div className="col-span-2">
            <Field label="Alimentación — describir un día normal">
              <TextArea value={h.alimentacion} onChange={v => set('alimentacion', v)} rows={3} />
            </Field>
          </div>
          <Field label="Trastornos de alimentación">
            <TextInput value={h.trastornos_alim} onChange={v => set('trastornos_alim', v)} />
          </Field>
          <Field label="Apetito">
            <TextInput value={h.apetito} onChange={v => set('apetito', v)} />
          </Field>
          <Field label="Antojos">
            <TextInput value={h.antojos} onChange={v => set('antojos', v)} />
          </Field>
          <Field label="Nivel de energía">
            <TextInput value={h.nivel_energia} onChange={v => set('nivel_energia', v)} />
          </Field>
          <div className="col-span-2">
            <Field label="Nivel de motivación">
              <TextInput value={h.nivel_motivacion} onChange={v => set('nivel_motivacion', v)} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Sección 4 — Gineco-obstétricos + Rutina de piel */}
      <Section title="4. Gineco-Obstétricos y Rutina de Piel" open={!!open[4]} onToggle={() => toggle(4)}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-accent)' }}>
          Antecedentes Gineco-Obstétricos
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            ['menarca','Menarca'], ['fum','FUM'], ['ritmo_menstrual','Ritmo menstrual'],
            ['gesta','G'], ['partos','P'], ['abortos','A'], ['cesareas','C'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
          <div className="col-span-3">
            <Field label="Complicaciones en los embarazos">
              <TextInput value={h.complicaciones_emb} onChange={v => set('complicaciones_emb', v)} />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="MAC (método anticonceptivo)">
              <TextInput value={h.mac} onChange={v => set('mac', v)} />
            </Field>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-accent)' }}>
          Rutina de Cuidado de la Piel
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['piel_limpieza','Limpieza'], ['piel_hidratacion','Hidratación'],
            ['piel_proteccion_solar','Protección solar'], ['piel_rutina_noche','Rutina de noche'],
            ['piel_desmaquillar','Frecuencia de desmaquillar y lavar'],
            ['piel_exposicion_sol','Exposición al sol/contaminación'],
            ['piel_retoque_protector','Retoque de protector solar'],
            ['piel_tiempo_dedicado','Tiempo dedicado al cuidado de piel'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
        </div>
      </Section>

      {/* Sección 5 — Motivo de consulta */}
      <Section title="5. Motivo de Consulta" open={!!open[5]} onToggle={() => toggle(5)}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            ['mc_envejecimiento','Envejecimiento cutáneo'], ['mc_estrias','Estrías'],
            ['mc_deshidratacion','Desidratación'], ['mc_adiposidad','Adiposidad localizada'],
            ['mc_hiperpigmentacion','Hiperpigmentación'], ['mc_obesidad','Obesidad'],
            ['mc_acne','Acné'], ['mc_flacidez','Flacidez'],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!h[k]}
                     onChange={e => set(k, e.target.checked)}
                     className="accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
        </div>
        <Field label="Especifique">
          <TextInput value={h.mc_especifique} onChange={v => set('mc_especifique', v)} />
        </Field>
      </Section>

      {/* Sección 6 — Tratamientos previos */}
      <Section title="6. Tratamientos Previos" open={!!open[6]} onToggle={() => {
        if (!open[6]) {
          initTratPrev('trat_prev_faciales', TRAT_FACIALES);
          initTratPrev('trat_prev_corporales', TRAT_CORPORALES);
        }
        toggle(6);
      }}>
        {['trat_prev_faciales', 'trat_prev_corporales'].map((tipo, ti) => {
          const names = ti === 0 ? TRAT_FACIALES : TRAT_CORPORALES;
          const rows = getTratRows(tipo, names);
          return (
            <div key={tipo} className={ti === 1 ? 'mt-6' : ''}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                {ti === 0 ? 'Faciales' : 'Corporales'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                      {['Sustancia/Procedimiento','Producto/Marca','Fecha de aplicación'].map(col => (
                        <th key={col} className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-dark)' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 font-medium text-xs">{row.tratamiento}</td>
                        <td className="px-3 py-2">
                          <input type="text" value={row.producto || ''}
                                 onChange={e => setTratPrev(tipo, idx, 'producto', e.target.value)}
                                 className={inputCls} style={borderStyle} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={row.fecha || ''} placeholder="ej. 2024-03"
                                 onChange={e => setTratPrev(tipo, idx, 'fecha', e.target.value)}
                                 className={inputCls} style={borderStyle} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </Section>

      {/* Sección 7 — Exploración física */}
      <Section title="7. Exploración Física" open={!!open[7]} onToggle={() => toggle(7)}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
          Fototipo Fitzpatrick
        </p>
        <div className="flex gap-2 mb-4 flex-wrap">
          {FITZPATRICK.map(f => (
            <button key={f.num} type="button"
                    onClick={() => set('fitzpatrick', f.num)}
                    className={`flex flex-col items-center p-2 rounded-lg border-2 text-xs transition-all w-20 ${h.fitzpatrick === f.num ? 'border-[var(--color-accent)] shadow-md' : 'border-gray-200'}`}>
              <div className="w-8 h-8 rounded-full mb-1 border border-gray-300"
                   style={{ backgroundColor: f.color }} />
              <span className="font-bold">{f.label}</span>
              <span className="text-gray-500 text-center leading-tight" style={{ fontSize: '10px' }}>{f.desc}</span>
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
          Clasificación Glogau
        </p>
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
            ['tipo_rostro','Tipo de rostro'], ['tipo_piel','Tipo de piel'],
            ['lesiones_derm','Lesiones dermatológicas'], ['tipo_lesion','Tipo de lesión'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
          <div className="col-span-2">
            <Field label="Localización">
              <TextInput value={h.localizacion} onChange={v => set('localizacion', v)} />
            </Field>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
          Signos Vitales
        </p>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            ['sv_fc','FC'], ['sv_fr','FR'], ['sv_ta','TA'], ['sv_temperatura','Temp.'],
            ['sv_saturacion','Saturación'], ['sv_peso','Peso'], ['sv_talla','Talla'], ['sv_imc','IMC'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
          Medidas en CM
        </p>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[['med_cintura','Cintura'], ['med_cadera','Cadera'], ['med_muslo','Muslo'], ['med_brazo','Brazo']].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
        </div>

        <Field label="Procedimiento a realizar">
          <TextArea value={h.procedimiento_realizar} onChange={v => set('procedimiento_realizar', v)} rows={3} />
        </Field>
      </Section>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {ok && <p className="text-green-600 text-sm mt-2">Historia clínica guardada correctamente.</p>}

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
