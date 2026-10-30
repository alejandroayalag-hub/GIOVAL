// Fecha de hoy del navegador (hora de México en la clínica). toISOString() da el día UTC:
// después de las 6 pm ya sería mañana.
export const hoyLocal = () => new Date().toLocaleDateString('en-CA');
