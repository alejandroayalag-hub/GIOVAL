import { useState } from 'react';
import { checkinCita, avanzarFlujo } from '../../api/flujo';
import NotaVisitaModal from '../NotaVisitaModal';

const ESTATUS_CONFIG = {
  agendada:         { color: '#cccad8', label: 'Agendada' },
  checkin:          { color: '#4a7c6a', label: 'Check-in' },
  en_consultorio:   { color: '#5a6aa0', label: 'En consultorio' },
  en_procedimiento: { color: '#7a6ab0', label: 'En procedimiento' },
  cierre:           { color: '#887482', label: 'Cierre' },
  en_caja:          { color: '#c07030', label: 'En caja' },
  completado:       { color: '#3d7a3d', label: 'Completado' },
};

const PASOS = ['checkin','en_consultorio','en_procedimiento','cierre','en_caja','completado'];
const ORDEN = { agendada:0, checkin:1, en_consultorio:2, en_procedimiento:3, cierre:4, en_caja:5, completado:6 };

function tiempoTranscurrido(isoStr) {
  if (!isoStr) return null;
  const mins = Math.floor((Date.now() - new Date(isoStr)) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function TarjetaPaciente({ cita, rol, consultorios, onRefresh }) {
  const [expandCheckin, setExpandCheckin] = useState(false);
  const [consultorioSel, setConsultorioSel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notaModal, setNotaModal] = useState(false);

  const cfg = ESTATUS_CONFIG[cita.estatus] || ESTATUS_CONFIG.agendada;
  const ordenActual = ORDEN[cita.estatus] ?? 0;

  const puedeCheckin  = ['admin','asistente_general'].includes(rol);
  const puedeTratante = ['admin','asistente_medico','cosmetista'].includes(rol);
  const puedeCaja     = ['admin','asistente_general'].includes(rol);

  async function handleCheckin() {
    if (!consultorioSel) { setError('Selecciona un consultorio'); return; }
    setLoading(true); setError('');
    try {
      await checkinCita(cita.cita_id, { consultorio_id: parseInt(consultorioSel) });
      onRefresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al hacer check-in');
    } finally { setLoading(false); }
  }

  async function handleAvanzar() {
    setLoading(true); setError('');
    try {
      await avanzarFlujo(cita.cita_id);
      onRefresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al avanzar');
    } finally { setLoading(false); }
  }

  function handleNotaGuardada() {
    setNotaModal(false);
    avanzarFlujo(cita.cita_id)
      .then(onRefresh)
      .catch(e => setError(e.response?.data?.error || 'Error al avanzar tras nota'));
  }

  const tiempo = tiempoTranscurrido(cita.hora_checkin);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
         style={{ borderColor: 'var(--color-sage)', borderLeft: `4px solid ${cfg.color}` }}>
      <div className="px-4 py-3">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-dark)' }}>
              {cita.paciente_nombre}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {cita.tratamiento_nombre || '—'}
              {cita.consultorio_nombre && (
                <span className="ml-2 text-gray-400">· {cita.consultorio_nombre}</span>
              )}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: cfg.color }}>
              {cfg.label}
            </span>
            {tiempo && (
              <p className="text-xs text-gray-400 mt-0.5">{tiempo}</p>
            )}
          </div>
        </div>

        {/* Pipeline */}
        <div className="flex gap-0.5 mt-2">
          {PASOS.map(paso => {
            const pasoOrden = ORDEN[paso];
            const hecho = pasoOrden <= ordenActual;
            return (
              <div key={paso} className="h-1.5 flex-1 rounded-full transition-all"
                   style={{
                     backgroundColor: hecho ? ESTATUS_CONFIG[paso].color : '#e5e7eb',
                     opacity: paso === cita.estatus ? 1 : hecho ? 0.7 : 0.3,
                   }} />
            );
          })}
        </div>

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        {/* Acción */}
        <div className="mt-3">
          {/* AGENDADA */}
          {cita.estatus === 'agendada' && puedeCheckin && (
            !expandCheckin ? (
              <button onClick={() => setExpandCheckin(true)}
                      className="w-full text-sm py-1.5 rounded-lg text-white font-medium"
                      style={{ backgroundColor: '#4a7c6a' }}>
                ✓ Check-in
              </button>
            ) : (
              <div className="flex gap-2">
                <select value={consultorioSel}
                        onChange={e => setConsultorioSel(e.target.value)}
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                        style={{ borderColor: 'var(--color-sage)' }}>
                  <option value="">— Consultorio —</option>
                  {consultorios.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <button onClick={handleCheckin} disabled={loading}
                        className="px-3 py-1.5 text-sm rounded-lg text-white font-medium disabled:opacity-50"
                        style={{ backgroundColor: '#4a7c6a' }}>
                  {loading ? '...' : 'OK'}
                </button>
                <button onClick={() => { setExpandCheckin(false); setError(''); }}
                        className="px-2 py-1.5 text-sm rounded-lg border"
                        style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
                  ✕
                </button>
              </div>
            )
          )}

          {cita.estatus === 'checkin' && puedeTratante && (
            <button onClick={handleAvanzar} disabled={loading}
                    className="w-full text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#5a6aa0' }}>
              {loading ? '...' : '→ Pasar a consultorio'}
            </button>
          )}

          {cita.estatus === 'en_consultorio' && puedeTratante && (
            <button onClick={handleAvanzar} disabled={loading}
                    className="w-full text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#7a6ab0' }}>
              {loading ? '...' : '⚡ Iniciar procedimiento'}
            </button>
          )}

          {cita.estatus === 'en_procedimiento' && puedeTratante && (
            <button onClick={handleAvanzar} disabled={loading}
                    className="w-full text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#887482' }}>
              {loading ? '...' : '✓ Terminar procedimiento'}
            </button>
          )}

          {cita.estatus === 'cierre' && puedeTratante && (
            <button onClick={() => setNotaModal(true)} disabled={loading}
                    className="w-full text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#887482' }}>
              📋 Completar nota SOAP
            </button>
          )}

          {cita.estatus === 'en_caja' && puedeCaja && (
            <button onClick={handleAvanzar} disabled={loading}
                    className="w-full text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#c07030' }}>
              {loading ? '...' : '💳 Confirmar pago recibido'}
            </button>
          )}

          {cita.estatus === 'completado' && (
            <p className="text-xs text-center text-gray-400 py-1">✓ Visita completada</p>
          )}
        </div>
      </div>

      {notaModal && cita.paciente_id && (
        <NotaVisitaModal
          cita={{ id: cita.cita_id, tratamiento_nombre: cita.tratamiento_nombre }}
          pacienteId={cita.paciente_id}
          onClose={() => setNotaModal(false)}
          onSaved={handleNotaGuardada}
        />
      )}
    </div>
  );
}
