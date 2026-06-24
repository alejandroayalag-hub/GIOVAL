import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, RefreshCw, Pencil } from 'lucide-react';
import { getFlujoHoy, getConsultorios, createConsultorio, updateConsultorio } from '../api/flujo';
import TarjetaPaciente from '../components/flujo/TarjetaPaciente';

export default function ProcedimientosPage() {
  const rol = localStorage.getItem('rol');
  const [tab, setTab] = useState('enlive');
  const [datos, setDatos] = useState({ activos: [], completados: [] });
  const [consultorios, setConsultorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [completadosAbiertos, setCompletadosAbiertos] = useState(false);
  const [formConsult, setFormConsult] = useState({ nombre: '', orden: '' });
  const [editConsult, setEditConsult] = useState(null);
  const [loadingConsult, setLoadingConsult] = useState(false);
  const intervalRef = useRef(null);

  const cargarConsultorios = useCallback(async () => {
    try { setConsultorios(await getConsultorios()); } catch { /* silent */ }
  }, []);

  const cargar = useCallback(async () => {
    try {
      const [data] = await Promise.all([getFlujoHoy(), cargarConsultorios()]);
      setDatos(data);
      setUltimaAct(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [cargarConsultorios]);

  useEffect(() => {
    cargar();
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') cargar();
    }, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [cargar]);

  async function handleSaveConsultorio(e) {
    e.preventDefault();
    setLoadingConsult(true);
    try {
      const data = { nombre: formConsult.nombre, orden: parseInt(formConsult.orden) || 0 };
      editConsult ? await updateConsultorio(editConsult.id, data) : await createConsultorio(data);
      setFormConsult({ nombre: '', orden: '' });
      setEditConsult(null);
      cargarConsultorios();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setLoadingConsult(false); }
  }

  function iniciarEditarConsultorio(c) {
    setEditConsult(c);
    setFormConsult({ nombre: c.nombre, orden: String(c.orden) });
  }

  async function toggleActivoConsultorio(c) {
    await updateConsultorio(c.id, { activo: !c.activo });
    cargarConsultorios();
  }

  if (loading) return (
    <div className="py-16 text-center text-gray-400 text-sm">Cargando…</div>
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #7a6ab0, #887482)' }}>
            <Activity className="w-5 h-5 text-white" strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>
              Procedimientos en vivo
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
              {ultimaAct
                ? `Actualizado: ${ultimaAct.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                : 'Cargando…'}
            </p>
          </div>
        </div>
        <button onClick={cargar}
                className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded-lg"
                style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
          <RefreshCw className="w-3 h-3" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--color-sage)' }}>
        {[
          { id: 'enlive', label: 'En vivo' },
          ...(rol === 'admin' ? [{ id: 'consultorios', label: 'Consultorios' }] : []),
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
                  className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                  style={{
                    borderColor: tab === id ? 'var(--color-accent)' : 'transparent',
                    color: tab === id ? 'var(--color-dark)' : 'var(--color-accent)',
                  }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── En vivo ──────────────────────────────────────────────────────────── */}
      {tab === 'enlive' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>Activos</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
                {datos.activos.length}
              </span>
            </div>
            {datos.activos.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm"
                   style={{ borderColor: 'var(--color-sage)' }}>
                Sin pacientes activos hoy
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {datos.activos.map(cita => (
                  <TarjetaPaciente
                    key={cita.cita_id}
                    cita={cita}
                    rol={rol}
                    consultorios={consultorios}
                    onRefresh={cargar}
                  />
                ))}
              </div>
            )}
          </div>

          {datos.completados.length > 0 && (
            <div>
              <button onClick={() => setCompletadosAbiertos(o => !o)}
                      className="flex items-center gap-2 mb-3 w-full text-left">
                <h2 className="text-sm font-semibold text-gray-400">
                  Completados ({datos.completados.length})
                </h2>
                <span className="text-xs text-gray-400">{completadosAbiertos ? '▲' : '▼'}</span>
              </button>
              {completadosAbiertos && (
                <div className="grid gap-3 sm:grid-cols-2 opacity-60">
                  {datos.completados.map(cita => (
                    <TarjetaPaciente
                      key={cita.cita_id}
                      cita={cita}
                      rol={rol}
                      consultorios={consultorios}
                      onRefresh={cargar}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Consultorios (admin) ─────────────────────────────────────────────── */}
      {tab === 'consultorios' && rol === 'admin' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveConsultorio}
                className="bg-white rounded-xl border p-4 flex gap-3 items-end flex-wrap"
                style={{ borderColor: 'var(--color-sage)' }}>
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input type="text" required value={formConsult.nombre}
                     onChange={e => setFormConsult(f => ({ ...f, nombre: e.target.value }))}
                     placeholder="ej. Consultorio 1"
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
              <input type="number" min="0" value={formConsult.orden}
                     onChange={e => setFormConsult(f => ({ ...f, orden: e.target.value }))}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loadingConsult}
                      className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {editConsult ? 'Actualizar' : 'Agregar'}
              </button>
              {editConsult && (
                <button type="button"
                        onClick={() => { setEditConsult(null); setFormConsult({ nombre: '', orden: '' }); }}
                        className="px-3 py-2 text-sm border rounded-lg"
                        style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="bg-white rounded-xl border overflow-hidden"
               style={{ borderColor: 'var(--color-sage)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-primary)' }}>
                <tr>
                  {['Orden','Nombre','Estado',''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {consultorios.map(c => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                    <td className="px-4 py-2 text-gray-400 text-xs">{c.orden}</td>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-dark)' }}>{c.nombre}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => toggleActivoConsultorio(c)}
                              className="text-xs px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: c.activo ? '#4a7c6a' : '#d1d5db',
                                color: c.activo ? '#4a7c6a' : '#9ca3af',
                              }}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => iniciarEditarConsultorio(c)}
                              className="p-1 rounded hover:bg-gray-100">
                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
