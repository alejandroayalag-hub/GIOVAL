// La clínica opera en hora de México; el servidor y la BD están en UTC.
// Sin esto, después de las 6 pm "hoy" ya es mañana.
const TZ = 'America/Mexico_City';

const hoyMx = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });

// Día de México de una columna timestamptz, para comparar contra hoyMx()
const diaMx = col => `(${col} AT TIME ZONE '${TZ}')::date`;

module.exports = { TZ, hoyMx, diaMx };
