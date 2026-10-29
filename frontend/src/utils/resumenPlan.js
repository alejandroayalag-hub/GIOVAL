// Campos de texto libre que el bloque estructurado reemplazó en los formatos de valoración
export const LEGACY_CAMPOS = [
  ['diagnostico', 'Diagnóstico'], ['diagnostico_cutaneo', 'Diagnóstico cutáneo'],
  ['diagnostico_capilar', 'Diagnóstico capilar'], ['tratamientos_propuestos', 'Tratamientos propuestos'],
  ['tratamiento_propuesto', 'Tratamiento propuesto'], ['plan_piel', 'Plan / protocolo sugerido'],
  ['plan_corporal', 'Plan corporal propuesto'], ['plan_capilar', 'Plan propuesto'],
  ['sesiones', 'Sesiones / frecuencia'],
];

// Líneas [etiqueta, texto] del diagnóstico y plan de una valoración (para imprimir).
export function resumenPlan(datos) {
  const lineas = LEGACY_CAMPOS.filter(([k]) => typeof datos?.[k] === 'string' && datos[k]).map(([k, label]) => [label, datos[k]]);
  const p = datos?.plan;
  if (!p) return lineas;
  const cie = p.diagnostico_cie10 && `CIE-10 ${p.diagnostico_cie10}${p.diagnostico_cie10_desc ? ` ${p.diagnostico_cie10_desc}` : ''}`;
  const dx = [p.diagnostico_texto?.trim(), cie].filter(Boolean).join(' · ');
  if (dx) lineas.push(['Diagnóstico', dx]);
  const trats = (p.tratamientos || []).filter(t => t.tratamiento_id).map(t => {
    const n = Number(t.sesiones) || 1;
    return `${t.tratamiento_nombre || `Tratamiento #${t.tratamiento_id}`} — ${n} ${n === 1 ? 'sesión' : 'sesiones'}${t.frecuencia ? `, ${t.frecuencia}` : ''}`;
  });
  if (trats.length) lineas.push(['Tratamientos propuestos', trats.join('; ')]);
  return lineas;
}
