import { useState, useEffect, useCallback } from 'react';
import { getCitas } from '../api/citas';
import { getEmpleados } from '../api/empleados';
import { syncPull, syncPushAll, syncStatus } from '../api/sync';
import CalendarioDia from '../components/CalendarioDia';
import CalendarioSemana from '../components/CalendarioSemana';
import CitaModal from '../components/CitaModal';
import SolicitudesTab from '../components/citas/SolicitudesTab';

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
  const rol = localStorage.getItem('rol');
  const [tab, setTab] = useState('calendario');
  const [vista, setVista] = useState('semana');
  const [fecha, setFecha] = useState(fechaLocal(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [citas, setCitas] = useState([]);
  const [empleadas, setEmpleadas] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gcConfigured, setGcConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

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
    syncStatus().then(d => setGcConfigured(d.configured)).catch(() => {});
  }, []);

  async function handleSyncPull() {
    setSyncing(true); setSyncMsg(null);
    try {
      const r = await syncPull();
      setSyncMsg(`✓ ${r.created} nuevas, ${r.updated} actualizadas desde Google Calendar`);
      cargarCitas();
    } catch (e) {
      setSyncMsg(`✗ ${e.response?.data?.error || 'Error al sincronizar'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  }

  async function handleSyncPush() {
    setSyncing(true); setSyncMsg(null);
    try {
      const r = await syncPushAll();
      setSyncMsg(`✓ ${r.pushed} citas enviadas a Google Calendar`);
    } catch (e) {
      setSyncMsg(`✗ ${e.response?.data?.error || 'Error al enviar'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  }

  function handleSaved() {
    setModal(null);
    cargarCitas();
  }

  const rangoLabel = () => {
    if (vista === 'dia') return fecha;
    const { desde, hasta } = getLunesViernes(weekOffset);
    return `${desde} — ${hasta}`;
  };

  const activeTabClass = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white';
  const inactiveTabClass = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors border';

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('calendario')}
          className={activeTabClass}
          style={{
            backgroundColor: tab === 'calendario' ? 'var(--color-accent)' : 'transparent',
            color: tab === 'calendario' ? 'white' : 'var(--color-dark)',
            border: tab === 'calendario' ? 'none' : '1px solid var(--color-sage)',
          }}
        >
          Calendario
        </button>
        {rol === 'admin' && (
          <button
            onClick={() => setTab('solicitudes')}
            className={activeTabClass}
            style={{
              backgroundColor: tab === 'solicitudes' ? 'var(--color-accent)' : 'transparent',
              color: tab === 'solicitudes' ? 'white' : 'var(--color-dark)',
              border: tab === 'solicitudes' ? 'none' : '1px solid var(--color-sage)',
            }}
          >
            Solicitudes Landing
          </button>
        )}
      </div>

      {tab === 'solicitudes' ? (
        <SolicitudesTab />
      ) : (
      <div>
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>Control de Citas</h1>
          {/* Botón Google Calendar sync */}
          {gcConfigured ? (
            <div className="flex items-center gap-1">
              <button onClick={handleSyncPull} disabled={syncing}
                      title="Importar citas de Google Calendar"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border disabled:opacity-50 hover:opacity-80 transition-opacity"
                      style={{ borderColor: '#4285f4', color: '#4285f4', backgroundColor: '#f0f4ff' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 3h-2V1.5h-1.5V3h-8V1.5H6.5V3h-2C3.67 3 3 3.67 3 4.5v15C3 20.33 3.67 21 4.5 21h15c.83 0 1.5-.67 1.5-1.5v-15C21 3.67 20.33 3 19.5 3zm0 16.5h-15V8.5h15v11z"/>
                </svg>
                {syncing ? 'Sincronizando...' : '↓ Importar'}
              </button>
              <button onClick={handleSyncPush} disabled={syncing}
                      title="Enviar citas del app a Google Calendar"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border disabled:opacity-50 hover:opacity-80 transition-opacity"
                      style={{ borderColor: '#4285f4', color: '#4285f4', backgroundColor: '#f0f4ff' }}>
                ↑ Exportar
              </button>
            </div>
          ) : (
            <span className="text-xs px-2 py-1 rounded-lg border"
                  style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}
                  title="Google Calendar pendiente de configuración">
              📅 Google Calendar: pendiente
            </span>
          )}
        </div>

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
      {syncMsg && (
        <div className="mb-3 px-4 py-2 rounded-lg text-sm"
             style={{
               backgroundColor: syncMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2',
               color: syncMsg.startsWith('✓') ? '#16a34a' : '#dc2626',
               border: `1px solid ${syncMsg.startsWith('✓') ? '#bbf7d0' : '#fecaca'}`,
             }}>
          {syncMsg}
        </div>
      )}

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
      )}
    </div>
  );
}
