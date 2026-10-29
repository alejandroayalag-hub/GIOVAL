// Qué plan queda ligado a la cita en CitaModal.
// candidatos: ids de planes elegibles, o null si aún no cargan / falló la carga.
export function elegirPlan({ candidatos, actual }) {
  if (candidatos === null) return actual;
  if (candidatos.includes(Number(actual))) return actual;
  return candidatos.length === 1 ? candidatos[0] : '';
}
