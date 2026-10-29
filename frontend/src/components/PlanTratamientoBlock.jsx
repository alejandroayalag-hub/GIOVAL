import { useState, useEffect } from 'react';
import { getTratamientosActivos } from '../api/tratamientos';
import { getPlanes } from '../api/planTratamientos';
import Cie10Picker from './Cie10Picker';
import BotonDictado from './BotonDictado';

const inputCls = 'border rounded-lg px-2 py-1.5 text-sm';
const bStyle = { borderColor: 'var(--color-primary)' };
const FILA_VACIA = { tratamiento_id: '', sesiones: 1, frecuencia: '', notas: '' };
// Campos de texto libre que este bloque reemplazó en los formatos de valoración
const LEGACY_CAMPOS = [
  ['diagnostico', 'Diagnóstico'], ['diagnostico_cutaneo', 'Diagnóstico cutáneo'],
  ['diagnostico_capilar', 'Diagnóstico capilar'], ['tratamientos_propuestos', 'Tratamientos propuestos'],
  ['tratamiento_propuesto', 'Tratamiento propuesto'], ['plan_piel', 'Plan / protocolo sugerido'],
  ['plan_corporal', 'Plan corporal propuesto'], ['plan_capilar', 'Plan propuesto'],
  ['sesiones', 'Sesiones / frecuencia'],
];
const ESTATUS_LABEL = { aceptado: 'Aceptado', completado: 'Completado', cancelado: 'Cancelado' };

// Contrato datos.plan (lo sincroniza el backend en services/planTratamiento.js):
// { diagnostico_cie10, diagnostico_cie10_desc, diagnostico_texto, diagnostico_id,
//   tratamientos: [{ plan_id?, tratamiento_id, sesiones, frecuencia, notas }] }
export default function PlanTratamientoBlock({ pacienteId, plan, onChange, legacy }) {
  const [catalogo, setCatalogo] = useState([]);
  const [estatusPlanes, setEstatusPlanes] = useState({});
  const p = plan || { tratamientos: [] };
  const filas = p.tratamientos || [];

  useEffect(() => {
    getTratamientosActivos().then(setCatalogo).catch(() => setCatalogo([]));
    getPlanes(pacienteId)
      .then(ps => setEstatusPlanes(Object.fromEntries(ps.map(x => [x.id, x.estatus]))))
      .catch(() => {});
  }, [pacienteId]);

  const set = (k, v) => onChange({ ...p, [k]: v });
  const setFila = (i, k, v) => set('tratamientos', filas.map((f, j) => (j === i ? { ...f, [k]: v } : f)));
  const bloqueada = f => f.plan_id && estatusPlanes[f.plan_id] && estatusPlanes[f.plan_id] !== 'sugerido';

  const legacyTxt = LEGACY_CAMPOS.map(([k, label]) => [label, legacy?.[k]]).filter(([, v]) => v);

  return (
    <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-sage)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
        Diagnóstico y plan de tratamiento
      </p>

      {legacyTxt.length > 0 && (
        <div className="mb-3 p-3 rounded-lg bg-gray-50 text-sm text-gray-600">
          <p className="text-xs font-medium text-gray-500 mb-1">Registro anterior</p>
          {legacyTxt.map(([k, v]) => <p key={k}><span className="font-medium">{k}:</span> {v}</p>)}
        </div>
      )}

      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium text-gray-600">Diagnóstico</label>
        <BotonDictado onTexto={t => set('diagnostico_texto', (p.diagnostico_texto ? p.diagnostico_texto + ' ' : '') + t)} />
      </div>
      <textarea rows={2} value={p.diagnostico_texto || ''} onChange={e => set('diagnostico_texto', e.target.value)}
                placeholder="Escribe o dicta el diagnóstico…" className={`w-full ${inputCls} mb-2`} style={bStyle} />
      <p className="text-xs text-gray-500 mb-1">Código CIE-10 (opcional)</p>
      <Cie10Picker
        value={p.diagnostico_cie10 ? { codigo: p.diagnostico_cie10, descripcion: p.diagnostico_cie10_desc } : null}
        onChange={sel => onChange({ ...p, diagnostico_cie10: sel?.codigo || null, diagnostico_cie10_desc: sel?.descripcion || null })} />

      <label className="block text-xs font-medium text-gray-600 mt-4 mb-1">Tratamientos propuestos</label>
      <div className="space-y-2">
        {filas.map((f, i) => (
          bloqueada(f) ? (
            <div key={i} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg bg-gray-50">
              <span className="flex-1">
                {catalogo.find(t => t.id === Number(f.tratamiento_id))?.nombre || 'Tratamiento'} · {f.sesiones} ses. {f.frecuencia && `· ${f.frecuencia}`}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
                {ESTATUS_LABEL[estatusPlanes[f.plan_id]]}
              </span>
            </div>
          ) : (
            <div key={i} className="grid grid-cols-[2fr_80px_1fr_1fr_auto] gap-2 items-center">
              <select value={f.tratamiento_id} onChange={e => setFila(i, 'tratamiento_id', Number(e.target.value) || '')}
                      className={inputCls} style={bStyle}>
                <option value="">— Tratamiento —</option>
                {catalogo.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              <input type="number" min={1} value={f.sesiones} title="Sesiones"
                     onChange={e => setFila(i, 'sesiones', Math.max(1, parseInt(e.target.value) || 1))}
                     className={inputCls} style={bStyle} />
              <input placeholder="Frecuencia (cada 15 días)" value={f.frecuencia || ''}
                     onChange={e => setFila(i, 'frecuencia', e.target.value)} className={inputCls} style={bStyle} />
              <input placeholder="Notas" value={f.notas || ''}
                     onChange={e => setFila(i, 'notas', e.target.value)} className={inputCls} style={bStyle} />
              <button type="button" onClick={() => set('tratamientos', filas.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
            </div>
          )
        ))}
      </div>
      <button type="button" onClick={() => set('tratamientos', [...filas, { ...FILA_VACIA }])}
              className="text-xs mt-2" style={{ color: 'var(--color-accent)' }}>
        + Agregar tratamiento
      </button>
    </div>
  );
}
