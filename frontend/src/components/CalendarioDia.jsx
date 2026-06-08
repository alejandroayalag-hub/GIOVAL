import { useMemo } from 'react';

const HORA_INICIO = 8;
const HORA_FIN = 20;
const SLOT_H = 60;
const TOTAL_H = (HORA_FIN - HORA_INICIO) * SLOT_H;
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => i + HORA_INICIO);
const COLORES = ['#cccad8','#aba3ba','#d4c5d0','#b8b0c8','#9a9070','#c8c0d8','#e0dce8','#887482'];

function colorTratamiento(id) {
  return COLORES[(id || 0) % COLORES.length];
}

function minutosDesdeInicio(fechaHora) {
  const d = new Date(fechaHora);
  return (d.getHours() - HORA_INICIO) * 60 + d.getMinutes();
}

export default function CalendarioDia({ citas, empleadas, fecha, onSlotClick, onCitaClick }) {
  const cols = useMemo(() => {
    const base = empleadas.length ? empleadas : [];
    const hayNoAsignadas = citas.some(c => !c.empleada_id);
    if (!base.length || hayNoAsignadas) return [...base, { id: null, nombre: 'Sin asignar' }];
    return base;
  }, [empleadas, citas]);

  function handleSlotClick(empleadaId, hora) {
    const d = new Date(fecha);
    d.setHours(hora, 0, 0, 0);
    onSlotClick?.({ empleada_id: empleadaId, fecha_hora: d.toISOString().slice(0, 16) });
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${cols.length}, minmax(140px, 1fr))` }}>
        {/* Header */}
        <div className="h-8" />
        {cols.map(emp => (
          <div key={emp.id ?? 'none'}
               className="h-8 px-2 flex items-center justify-center text-xs font-semibold truncate border-l"
               style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-dark)', borderColor: 'var(--color-accent)' }}>
            {emp.nombre} {emp.apellido_paterno || ''}
          </div>
        ))}

        {/* Eje de horas */}
        <div style={{ position: 'relative', height: TOTAL_H }}>
          {HORAS.map(h => (
            <div key={h}
                 style={{ position: 'absolute', top: (h - HORA_INICIO) * SLOT_H, height: SLOT_H, width: '100%', borderTop: '1px solid #e5e7eb' }}
                 className="flex items-start pt-1 justify-end pr-2">
              <span className="text-xs text-gray-400">{String(h).padStart(2,'0')}:00</span>
            </div>
          ))}
        </div>

        {/* Columnas por empleada */}
        {cols.map(emp => {
          const citasEmp = citas.filter(c =>
            emp.id === null ? !c.empleada_id : c.empleada_id === emp.id
          );
          return (
            <div key={emp.id ?? 'none'}
                 style={{ position: 'relative', height: TOTAL_H, borderLeft: '1px solid #e5e7eb' }}>
              {HORAS.slice(0, -1).map(h => (
                <div key={h}
                     onClick={() => handleSlotClick(emp.id, h)}
                     style={{ position: 'absolute', top: (h - HORA_INICIO) * SLOT_H, height: SLOT_H, width: '100%', borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}
                     className="hover:bg-purple-50 transition-colors" />
              ))}
              {citasEmp.map(cita => {
                const top = minutosDesdeInicio(cita.fecha_hora);
                const height = Math.max(cita.duracion_min || 60, 30);
                if (top < 0 || top >= TOTAL_H) return null;
                return (
                  <div key={cita.id}
                       onClick={e => { e.stopPropagation(); onCitaClick?.(cita); }}
                       style={{
                         position: 'absolute', top, height, left: 4, right: 4,
                         backgroundColor: colorTratamiento(cita.tratamiento_id),
                         borderLeft: '3px solid var(--color-dark)',
                         borderRadius: 6, padding: '2px 6px', cursor: 'pointer',
                         overflow: 'hidden', zIndex: 1,
                         opacity: cita.estatus === 'cancelada' ? 0.4 : 1,
                       }}>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-dark)' }}>
                      {cita.nombre_paciente}
                    </p>
                    {height >= 40 && (
                      <p className="text-xs truncate text-gray-600">{cita.tratamiento_nombre || '—'}</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
