import { useState, useEffect, useCallback } from 'react';
import { getCitas } from '../api/citas';
import { getEmpleados } from '../api/empleados';
import CalendarioDia from '../components/CalendarioDia';
import CalendarioSemana from '../components/CalendarioSemana';
import CitaModal from '../components/CitaModal';

function fechaLocal(d) {
  return d.toLocaleDateString('sv-SE');
}

function getLunesViernes(weekOffset) {
  const hoy = new Date();
  const dia = hoy.getDay() || 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - dia + 1 + weekOffset * 7);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { desde: fechaLocal(lunes), hasta: fechaLocal(domingo) };
}

export default function CitasPage() {
  const [vista, setVista] = useState('semana');
  const [fecha, setFecha] = useState(fechaLocal(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [citas, setCitas] = useState([]);
  const [empleadas, setEmpleadas] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargarCitas = useCallback(async () => {
    setLoading(true);
    try {
      const params = vista === 'dia' ? { fecha } : getLunesViernes(weekOffset);
      setCitas(await getCitas(params));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vista, fecha, weekOffset]);

  useEffect(() => { cargarCitas(); }, [cargarCitas]);

  useEffect(() => {
    getEmpleados()
      .then(data => setEmpleadas(data.filter(e => e.estatus === 'activo')))
      .catch(console.error);
  }, []);

  function handleSaved() {
    setModal(null);
    cargarCitas();
  }

  const rangoLabel = () => {
    if (vista === 'dia') return fecha;
    const { desde, hasta } = getLunesViernes(weekOffset);
    return `${desde} — ${hasta}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>Control de Citas</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vista */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-accent)' }}>
            {['dia', 'semana'].map(v => (
              <button key={v} onClick={() => setVista(v)}
                      className="px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: vista === v ? 'var(--color-accent)' : 'white',
                        color: vista === v ? 'white' : 'var(--color-dark)',
                      }}>
                {v === 'dia' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>

          {/* Navegación */}
          {vista === 'dia' ? (
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                   className="border rounded-lg px-3 py-1.5 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(w => w - 1)}
                      className="px-2 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>‹</button>
              <span className="text-sm px-2" style={{ color: 'var(--color-dark)' }}>{rangoLabel()}</span>
              <button onClick={() => setWeekOffset(w => w + 1)}
                      className="px-2 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>›</button>
              <button onClick={() => setWeekOffset(0)}
                      className="px-2 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>Hoy</button>
            </div>
          )}

          <button onClick={() => setModal({ fechaHoraInicial: `${fecha}T09:00` })}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
            + Nueva cita
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400 mb-2">Cargando...</p>}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
           style={{ borderColor: 'var(--color-sage)' }}>
        {vista === 'dia' ? (
          <CalendarioDia
            citas={citas}
            empleadas={empleadas}
            fecha={fecha}
            onSlotClick={({ empleada_id, fecha_hora }) => setModal({ fechaHoraInicial: fecha_hora, empleadaIdInicial: empleada_id })}
            onCitaClick={cita => setModal({ cita })}
          />
        ) : (
          <CalendarioSemana
            citas={citas}
            weekOffset={weekOffset}
            onSlotClick={({ fecha_hora }) => setModal({ fechaHoraInicial: fecha_hora })}
            onCitaClick={cita => setModal({ cita })}
          />
        )}
      </div>

      {modal && (
        <CitaModal
          cita={modal.cita}
          fechaHoraInicial={modal.fechaHoraInicial}
          empleadaIdInicial={modal.empleadaIdInicial}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
