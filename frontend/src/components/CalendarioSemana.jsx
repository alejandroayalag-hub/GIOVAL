import { useMemo } from 'react';

const HORA_INICIO = 8;
const HORA_FIN = 20;
const SLOT_H = 48;
const TOTAL_H = (HORA_FIN - HORA_INICIO) * SLOT_H;
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => i + HORA_INICIO);
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const COLORES = ['#cccad8','#aba3ba','#d4c5d0','#b8b0c8','#9a9070','#c8c0d8','#e0dce8','#887482'];

function colorTratamiento(id) { return COLORES[(id || 0) % COLORES.length]; }

function minutosDesdeInicio(fechaHora) {
  const d = new Date(fechaHora);
  return (d.getHours() - HORA_INICIO) * 60 + d.getMinutes();
}

function getLunesDeSemana(offset) {
  const hoy = new Date();
  const dia = hoy.getDay() || 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - dia + 1 + offset * 7);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

export default function CalendarioSemana({ citas, weekOffset, onCitaClick, onSlotClick }) {
  const diasSemana = useMemo(() => {
    const lunes = getLunesDeSemana(weekOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  function citasDelDia(diaDate) {
    return citas.filter(c => new Date(c.fecha_hora).toDateString() === diaDate.toDateString());
  }

  function handleSlotClick(diaDate, hora) {
    const d = new Date(diaDate);
    d.setHours(hora, 0, 0, 0);
    onSlotClick?.({ fecha_hora: d.toISOString().slice(0, 16) });
  }

  const formatDia = (d) => `${DIAS[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()}`;
  const hoy = new Date().toDateString();

  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(7, minmax(100px, 1fr))` }}>
        {/* Header */}
        <div className="h-9" />
        {diasSemana.map((d, i) => (
          <div key={i}
               className="h-9 flex items-center justify-center text-xs font-semibold border-l"
               style={{
                 backgroundColor: d.toDateString() === hoy ? 'var(--color-accent)' : 'var(--color-primary)',
                 color: 'var(--color-dark)',
                 borderColor: 'var(--color-sage)',
               }}>
            {formatDia(d)}
          </div>
        ))}

        {/* Eje de horas */}
        <div style={{ position: 'relative', height: TOTAL_H }}>
          {HORAS.map(h => (
            <div key={h}
                 style={{ position: 'absolute', top: (h - HORA_INICIO) * SLOT_H, height: SLOT_H, width: '100%', borderTop: '1px solid #e5e7eb' }}
                 className="flex items-start justify-end pr-1 pt-0.5">
              <span className="text-xs text-gray-400">{String(h).padStart(2,'0')}:00</span>
            </div>
          ))}
        </div>

        {/* Columnas por día */}
        {diasSemana.map((diaDate, i) => {
          const citasDia = citasDelDia(diaDate);
          return (
            <div key={i}
                 style={{ position: 'relative', height: TOTAL_H, borderLeft: '1px solid #e5e7eb' }}>
              {HORAS.slice(0, -1).map(h => (
                <div key={h}
                     onClick={() => handleSlotClick(diaDate, h)}
                     style={{ position: 'absolute', top: (h - HORA_INICIO) * SLOT_H, height: SLOT_H, width: '100%', borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}
                     className="hover:bg-purple-50 transition-colors" />
              ))}
              {citasDia.map(cita => {
                const top = Math.round(minutosDesdeInicio(cita.fecha_hora) * SLOT_H / 60);
                const height = Math.max(Math.round((cita.duracion_min || 60) * SLOT_H / 60), 22);
                if (top < 0 || top >= TOTAL_H) return null;
                return (
                  <div key={cita.id}
                       onClick={e => { e.stopPropagation(); onCitaClick?.(cita); }}
                       style={{
                         position: 'absolute', top, height, left: 2, right: 2,
                         backgroundColor: colorTratamiento(cita.tratamiento_id),
                         borderLeft: '3px solid var(--color-dark)',
                         borderRadius: 4, padding: '1px 4px', cursor: 'pointer',
                         overflow: 'hidden', zIndex: 1,
                         opacity: cita.estatus === 'cancelada' ? 0.4 : 1,
                       }}>
                    <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--color-dark)' }}>
                      {cita.nombre_paciente}
                    </p>
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
