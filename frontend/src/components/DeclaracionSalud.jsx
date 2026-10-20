import { Fragment } from 'react';

// Declaración de Salud (CI-02) — cuestionario que la paciente llena antes de firmar.
// Las respuestas se guardan como { [etiqueta]: valor } en consentimientos_firmados.respuestas.
const YN = ['Sí', 'No'];

const SECCIONES = [
  { titulo: '01 · Datos de la paciente', campos: [
    ['text', 'Ocupación'],
    ['text', 'Contacto de emergencia (nombre y teléfono)'],
    ['text', 'Tratamiento a realizar'],
    ['radio', 'Sucursal', ['Morelia', 'Uruapan']],
  ] },
  { titulo: '02 · Condiciones médicas — ¿Padece o ha padecido…?', grupos: [
    ['Corazón, circulación y sangre', ['Hipertensión arterial', 'Presión baja o desmayos', 'Enfermedad del corazón o arritmias',
      'Marcapasos o desfibrilador', 'Trombosis, embolia o várices', 'Anemia', 'Trastornos de la coagulación',
      'Sangrado o moretones con facilidad']],
    ['Metabolismo y hormonas', ['Diabetes tipo 1 o 2', 'Resistencia a la insulina o prediabetes', 'Hipotiroidismo o hipertiroidismo',
      'Síndrome de ovario poliquístico', 'Colesterol o triglicéridos altos', 'Sobrepeso u obesidad']],
    ['Sistema nervioso y músculos', ['Epilepsia o convulsiones', 'Migraña frecuente', 'Parálisis facial (de Bell)',
      'Miastenia gravis, ELA u otra neuromuscular', 'Pérdida de sensibilidad o neuropatía', 'Embolia o infarto cerebral']],
    ['Sistema inmune e infecciones', ['Lupus, artritis reumatoide u otra autoinmune', 'Inmunosupresión o trasplante',
      'Hepatitis B o C', 'VIH', 'Herpes labial o genital recurrente', 'Infección activa (piel, dental, senos nasales)']],
    ['Piel', ['Acné activo o rosácea', 'Psoriasis o dermatitis', 'Melasma, manchas o vitíligo', 'Queloides o cicatrices gruesas',
      'Lunares que han cambiado', 'Sensibilidad al sol']],
    ['Otras condiciones', ['Cáncer (actual o previo)', 'Enfermedad del riñón', 'Enfermedad del hígado', 'Asma o enfermedad pulmonar',
      'Gastritis, colitis o reflujo', 'Ansiedad, depresión u otro padecimiento psiquiátrico', 'Trastorno de la conducta alimentaria',
      'Implantes metálicos, placas o prótesis']],
  ], campos: [
    ['area', 'Cirugías u hospitalizaciones (motivo y fecha)'],
    ['area', 'Si respondió «Sí» en esta sección, especifique'],
  ] },
  { titulo: '03 · Alergias', campos: [
    ['check', 'No tengo alergias conocidas'],
    ['multi', 'Alergia a medicamentos', ['Penicilina o amoxicilina', 'Sulfas', 'Aspirina o antiinflamatorios', 'Otro antibiótico']],
    ['multi', 'Alergia a anestesia y materiales', ['Lidocaína u otro anestésico', 'Látex', 'Adhesivos o cinta', 'Yodo o clorhexidina', 'Níquel o metales']],
    ['multi', 'Alergia a productos estéticos', ['Ácido hialurónico', 'Toxina botulínica', 'Cosméticos o cremas', 'Tintes o fragancias']],
    ['multi', 'Alergia a alimentos y otros', ['Huevo o albúmina', 'Mariscos', 'Picaduras de insecto', 'Otra']],
    ['multi', 'Reacción que tuvo', ['Ronchas o comezón', 'Hinchazón', 'Dificultad para respirar', 'Anafilaxia']],
    ['text', 'Especifique a qué es alérgica'],
  ] },
  { titulo: '04 · Medicamentos y suplementos — ¿Toma o ha tomado en los últimos meses…?', grupos: [
    ['', ['Anticoagulantes (warfarina, rivaroxabán, apixabán)', 'Aspirina o clopidogrel', 'Antiinflamatorios (ibuprofeno, naproxeno)',
      'Isotretinoína (últimos 12 meses)', 'Corticoides orales, inyectados o en crema', 'Retinol, tretinoína o ácidos en crema',
      'Antibióticos actualmente', 'Anticonceptivos o terapia hormonal', 'Medicamento para tiroides', 'Antihipertensivos',
      'Metformina, insulina o semaglutida / tirzepatida', 'Antidepresivos, ansiolíticos o para dormir',
      'Suplementos (vitamina E, omega-3, ginkgo, ajo)', 'Herbolaria o productos naturales']],
  ], campos: [
    ['area', 'Medicamentos y suplementos actuales (dosis, frecuencia, desde cuándo)'],
  ] },
  { titulo: '05 · Tabaquismo, alcohol y drogas', grupos: [
    ['', ['Vapeador o cigarro electrónico', '¿Podría suspenderlo 2 semanas antes y después del tratamiento?',
      'Sol intenso o bronceado en las últimas 2 semanas', 'Uso de camas de bronceado']],
  ], campos: [
    ['radio', 'Tabaco', ['Nunca he fumado', 'Exfumadora', 'Fumo actualmente']],
    ['text', 'Tabaco: hace cuánto lo dejó / cigarros al día'],
    ['radio', 'Alcohol', ['No consumo', 'Ocasional', 'Cada semana', 'Diario']],
    ['text', 'Copas por semana'],
    ['multi', 'Drogas o sustancias recreativas', ['Ninguna', 'Marihuana o CBD', 'Cocaína', 'Anfetaminas o metanfetamina', 'Éxtasis / MDMA', 'Opioides', 'Otra']],
    ['text', 'Frecuencia y fecha del último consumo'],
  ] },
  { titulo: '06 · Salud de la mujer', mujer: true, grupos: [
    ['', ['¿Está embarazada o podría estarlo?', '¿Está en periodo de lactancia?',
      '¿Planea embarazarse en los próximos 6 meses?', '¿Está en menopausia o perimenopausia?']],
  ], campos: [
    ['text', 'Fecha de última menstruación'],
    ['text', 'Método anticonceptivo'],
  ] },
  { titulo: '07 · Tratamientos estéticos previos', grupos: [
    ['', ['Toxina botulínica', 'Rellenos (ácido hialurónico u otros)', 'Bioestimuladores', 'Hilos tensores', 'Láser o IPL',
      'Radiofrecuencia o HIFU', 'Peelings químicos', 'Cirugía estética']],
  ], campos: [
    ['text', 'Producto, zona y fecha aproximada'],
    ['text', '¿Tuvo alguna complicación o reacción? ¿Cuál?'],
  ] },
  { titulo: 'Uso exclusivo de la clínica', campos: [
    ['area', 'Observaciones médicas'],
    ['radio', 'Apta para tratamiento', ['Sí', 'No', 'Requiere valoración adicional']],
  ] },
];

const aplica = (s, sexo) => !s.mujer || sexo !== 'Masculino';

// Preguntas Sí/No que deben quedar contestadas antes de firmar
export function preguntasSinResponder(respuestas, sexo) {
  return SECCIONES.filter(s => aplica(s, sexo))
    .flatMap(s => (s.grupos || []).flatMap(([, preguntas]) => preguntas))
    .filter(p => !respuestas[p]);
}

const inputCls = 'w-full border rounded-lg px-2 py-1 text-sm';
const borde = { borderColor: 'var(--color-sage)' };

export default function DeclaracionSalud({ respuestas, onChange, sexo, readOnly }) {
  const set = (k, v) => onChange?.({ ...respuestas, [k]: v });
  const toggle = (k, opt) => {
    const actual = respuestas[k] || [];
    set(k, actual.includes(opt) ? actual.filter(o => o !== opt) : [...actual, opt]);
  };

  // función (no componente) para no remontar inputs y perder el foco en cada tecla
  function campo([tipo, label, opts]) {
    const v = respuestas[label];
    if (tipo === 'text' || tipo === 'area') {
      const Tag = tipo === 'area' ? 'textarea' : 'input';
      return (
        <label className="block text-xs text-gray-600 sm:col-span-2">
          {label}
          <Tag value={v || ''} rows={2} onChange={e => set(label, e.target.value)} className={inputCls} style={borde} />
        </label>
      );
    }
    if (tipo === 'check') {
      return (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={!!v} onChange={e => set(label, e.target.checked)} /> {label}
        </label>
      );
    }
    return (
      <div className="text-xs text-gray-600 sm:col-span-2">
        {label}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {opts.map(o => (
            <label key={o} className="flex items-center gap-1 text-sm text-gray-700">
              {tipo === 'radio'
                ? <input type="radio" checked={v === o} onChange={() => set(label, o)} />
                : <input type="checkbox" checked={(v || []).includes(o)} onChange={() => toggle(label, o)} />}
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <fieldset disabled={readOnly} className="space-y-4">
      {SECCIONES.filter(s => aplica(s, sexo)).map(s => (
        <div key={s.titulo} className="rounded-xl border p-4" style={borde}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-accent)' }}>{s.titulo}</p>
          {(s.grupos || []).map(([nombre, preguntas]) => (
            <div key={nombre || s.titulo} className="mb-3">
              {nombre && <p className="text-xs font-medium text-gray-500 mb-1">{nombre}</p>}
              {preguntas.map(p => (
                <div key={p} className="flex justify-between items-center gap-3 py-1 border-b last:border-b-0 text-sm" style={borde}>
                  <span className={!respuestas[p] && !readOnly ? 'text-gray-800' : 'text-gray-600'}>{p}</span>
                  <span className="flex gap-3 flex-shrink-0">
                    {YN.map(o => (
                      <label key={o} className="flex items-center gap-1">
                        <input type="radio" checked={respuestas[p] === o} onChange={() => set(p, o)} /> {o}
                      </label>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(s.campos || []).map(c => <Fragment key={c[1]}>{campo(c)}</Fragment>)}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
