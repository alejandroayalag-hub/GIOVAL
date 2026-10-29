import { useState, useEffect } from 'react';
import { getPlanes, getHistorialProcedimientos } from '../api/planTratamientos';
import { getDocsByPaciente } from '../api/documentosClinicos';
import { TIPOS, DocModal } from './DocumentosClinicosTab';

const cardBorder = { borderColor: 'var(--color-sage)' };
const FORMATOS_SESION = TIPOS.filter(t => t.group === 'Procedimientos' || t.group === 'Bitácoras');
const etiquetaTipo = tipo => TIPOS.find(t => t.key === tipo)?.label || tipo;
// 'YYYY-MM-DD' (json_build_object de un DATE) se lee como fecha local, no como medianoche UTC
const fecha = f => {
  if (!f) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(f) ? new Date(`${f}T00:00:00`) : new Date(f);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

function SubTab({ active, onClick, children }) {
  return (
    <button onClick={onClick}
            className="px-3 py-1.5 text-sm rounded-lg border"
            style={active
              ? { backgroundColor: 'var(--color-accent)', color: 'white', borderColor: 'var(--color-accent)' }
              : { ...cardBorder, color: 'var(--color-dark)' }}>
      {children}
    </button>
  );
}

function PlanCard({ plan, children }) {
  return (
    <div className="bg-white rounded-xl border p-4" style={cardBorder}>
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--color-dark)' }}>{plan.tratamiento_nombre}</p>
          <p className="text-xs text-gray-500">
            {plan.sesiones_estimadas} {plan.sesiones_estimadas === 1 ? 'sesión' : 'sesiones'}
            {plan.frecuencia && ` · ${plan.frecuencia}`}
          </p>
          {plan.diagnostico_label && <p className="text-xs text-gray-500 mt-1">Dx: {plan.diagnostico_label}</p>}
          {plan.notas && <p className="text-xs text-gray-500 mt-1">{plan.notas}</p>}
        </div>
        {plan.valoracion_tipo && (
          <p className="text-xs text-gray-400 text-right flex-shrink-0">
            {etiquetaTipo(plan.valoracion_tipo).split(' · ')[0]}<br />{fecha(plan.valoracion_fecha)}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function ProcedimientosTab({ pacienteId }) {
  const [planes, setPlanes] = useState([]);
  const [hist, setHist] = useState({ sesiones: [], sin_sesion: [] });
  const [docs, setDocs] = useState([]);
  const [sub, setSub] = useState(null);
  const [modal, setModal] = useState(null); // { tipo, doc?, citaId? }
  const [menuCita, setMenuCita] = useState(null);

  async function cargar() {
    const [p, h, d] = await Promise.all([
      getPlanes(pacienteId).catch(() => []),
      getHistorialProcedimientos(pacienteId).catch(() => ({ sesiones: [], sin_sesion: [] })),
      getDocsByPaciente(pacienteId).catch(() => []),
    ]);
    setPlanes(p); setHist(h); setDocs(d);
    setSub(s => s || (p.some(x => x.estatus === 'sugerido') ? 'sugeridos' : 'realizar'));
  }
  useEffect(() => { cargar(); }, [pacienteId]);

  const sugeridos = planes.filter(p => p.estatus === 'sugerido');
  const aceptados = planes.filter(p => p.estatus === 'aceptado');
  const cerrados  = planes.filter(p => ['completado', 'cancelado'].includes(p.estatus));
  const abrirDoc = d => setModal({ tipo: d.tipo, doc: docs.find(x => x.id === d.id) || null });

  const DocLink = ({ d }) => (
    <button onClick={() => abrirDoc(d)} className="text-xs underline mr-3" style={{ color: 'var(--color-accent)' }}>
      {etiquetaTipo(d.tipo).split(' · ')[0]} · {fecha(d.fecha)}
    </button>
  );

  return (
    <div>
      <div className="flex gap-2 mb-4 print:hidden">
        <SubTab active={sub === 'sugeridos'} onClick={() => setSub('sugeridos')}>Sugeridos ({sugeridos.length})</SubTab>
        <SubTab active={sub === 'realizar'} onClick={() => setSub('realizar')}>A realizar ({aceptados.length})</SubTab>
        <SubTab active={sub === 'historial'} onClick={() => setSub('historial')}>Historial</SubTab>
      </div>

      {sub === 'sugeridos' && (
        sugeridos.length === 0
          ? <p className="text-sm text-gray-400">Sin tratamientos sugeridos. Se agregan desde una valoración.</p>
          : <div className="space-y-3">
              {sugeridos.map(p => (
                <PlanCard key={p.id} plan={p}>
                  <p className="text-xs text-gray-400 mt-2">Pendiente de presupuesto</p>
                </PlanCard>
              ))}
            </div>
      )}

      {sub === 'realizar' && (
        aceptados.length === 0
          ? <p className="text-sm text-gray-400">Sin tratamientos aceptados.</p>
          : <div className="space-y-3">
              {aceptados.map(p => (
                <PlanCard key={p.id} plan={p}>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{p.sesiones_realizadas} de {p.sesiones_estimadas} sesiones</span>
                      {p.proxima_cita && <span>Próxima: {fecha(p.proxima_cita.fecha_hora)}</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200">
                      <div className="h-1.5 rounded-full"
                           style={{ width: `${Math.min(100, 100 * p.sesiones_realizadas / p.sesiones_estimadas)}%`, backgroundColor: 'var(--color-accent)' }} />
                    </div>
                  </div>
                </PlanCard>
              ))}
            </div>
      )}

      {sub === 'historial' && (
        <div className="space-y-3">
          {hist.sesiones.length === 0 && <p className="text-sm text-gray-400">Sin sesiones realizadas.</p>}
          {hist.sesiones.map(s => (
            <div key={s.cita_id} className="bg-white rounded-xl border p-4" style={cardBorder}>
              <div className="flex justify-between gap-3">
                <p className="text-sm" style={{ color: 'var(--color-dark)' }}>
                  {s.sesion_n && <span className="font-semibold">Sesión {s.sesion_n} de {s.sesiones_estimadas} · </span>}
                  {s.tratamiento_nombre || 'Cita'} · {fecha(s.fecha_hora)}
                  {s.empleada_nombre && <span className="text-gray-500"> · {s.empleada_nombre}</span>}
                </p>
                <div className="relative print:hidden">
                  <button onClick={() => setMenuCita(menuCita === s.cita_id ? null : s.cita_id)}
                          className="text-xs px-2 py-1 rounded-lg border" style={{ ...cardBorder, color: 'var(--color-accent)' }}>
                    + Formato
                  </button>
                  {menuCita === s.cita_id && (
                    <div className="absolute right-0 z-10 mt-1 w-64 bg-white border rounded-lg shadow-lg" style={cardBorder}>
                      {FORMATOS_SESION.map(t => (
                        <button key={t.key} onClick={() => { setMenuCita(null); setModal({ tipo: t.key, doc: null, citaId: s.cita_id }); }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {s.documentos.length > 0 && <div className="mt-2">{s.documentos.map(d => <DocLink key={d.id} d={d} />)}</div>}
            </div>
          ))}

          {hist.sin_sesion.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Formatos sin sesión ligada</p>
              {hist.sin_sesion.map(d => <DocLink key={d.id} d={d} />)}
            </div>
          )}

          {cerrados.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-medium text-gray-500 mb-2">Tratamientos cerrados</p>
              {cerrados.map(p => (
                <p key={p.id} className="text-xs text-gray-600">
                  {p.tratamiento_nombre} · {p.sesiones_realizadas} de {p.sesiones_estimadas} ·{' '}
                  {p.estatus === 'completado' ? 'Completado' : `Cancelado${p.motivo_cancelacion ? ` (${p.motivo_cancelacion})` : ''}`}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <DocModal pacienteId={pacienteId} tipo={modal.tipo} doc={modal.doc} citaId={modal.citaId}
                  onClose={() => setModal(null)}
                  onSaved={() => { setModal(null); cargar(); }} />
      )}
    </div>
  );
}
