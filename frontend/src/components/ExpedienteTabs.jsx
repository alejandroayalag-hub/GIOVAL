import { useState, useEffect, useRef } from 'react';
import {
  searchCie10, getDiagnosticos, createDiagnostico, updateDiagnostico, deleteDiagnostico,
  getRecetas, createReceta, deleteReceta,
  getNotasMedicas, createNotaMedica, updateNotaMedica, deleteNotaMedica,
  getArchivos, uploadArchivo, deleteArchivo, archivoUrl,
} from '../api/expediente';
import BotonDictado from './BotonDictado';
import logoGioval from '../assets/gioval-logo.png';
import recetaFondo from '../assets/receta-gv.jpg';

const btnAccent = { backgroundColor: 'var(--color-accent)' };
const cardBorder = { borderColor: 'var(--color-sage)' };

// ── Diagnósticos (CIE-10) ─────────────────────────────────────────────────────
export function DiagnosticosTab({ pacienteId, rol, onChanged }) {
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [notasNuevo, setNotasNuevo] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const timer = useRef(null);

  const cargar = () => getDiagnosticos(pacienteId).then(d => { setDiagnosticos(d); onChanged?.(d); }).catch(console.error);
  useEffect(() => { cargar(); }, [pacienteId]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResultados([]); return; }
    timer.current = setTimeout(() => {
      searchCie10(q.trim()).then(setResultados).catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q]);

  async function agregar() {
    if (!seleccion) return;
    try {
      await createDiagnostico({
        paciente_id: pacienteId, cie10_codigo: seleccion.codigo,
        notas: notasNuevo.trim() || null,
      });
      setSeleccion(null); setQ(''); setResultados([]); setNotasNuevo('');
      cargar();
    } catch (e) { alert(e.response?.data?.error || 'Error al agregar diagnóstico'); }
  }

  return (
    <div>
      <div className="bg-white rounded-xl border p-4 mb-4" style={cardBorder}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-dark)' }}>
          Agregar diagnóstico (catálogo CIE-10)
        </p>
        {!seleccion ? (
          <div className="relative">
            <input type="text" value={q} onChange={e => setQ(e.target.value)}
                   placeholder="Busca por código o descripción (ej. E11 o diabetes)…"
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
            {resultados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto" style={cardBorder}>
                {resultados.map(r => (
                  <button key={r.codigo} type="button"
                          onClick={() => setSeleccion(r)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0" style={cardBorder}>
                    <span className="font-mono font-semibold mr-2" style={{ color: 'var(--color-accent)' }}>{r.codigo}</span>
                    {r.descripcion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-semibold text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-accent)' }}>
                {seleccion.codigo}
              </span>
              <span className="text-sm">{seleccion.descripcion}</span>
              <button type="button" onClick={() => setSeleccion(null)} className="text-xs text-gray-400 hover:text-red-500">✕ cambiar</button>
            </div>
            <textarea rows={2} value={notasNuevo} onChange={e => setNotasNuevo(e.target.value)}
                      placeholder="Notas del diagnóstico (opcional)"
                      className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                      style={{ borderColor: 'var(--color-primary)' }} />
            <button onClick={agregar} className="px-4 py-2 text-sm text-white rounded-lg" style={btnAccent}>
              Agregar diagnóstico
            </button>
          </div>
        )}
      </div>

      {diagnosticos.length === 0 ? (
        <p className="text-sm text-gray-400">Sin diagnósticos registrados.</p>
      ) : (
        <div className="space-y-3">
          {diagnosticos.map(d => (
            <div key={d.id} className="bg-white rounded-xl border p-4" style={cardBorder}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                    <span className="font-mono mr-2" style={{ color: 'var(--color-accent)' }}>{d.cie10_codigo}</span>
                    {d.cie10_descripcion}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(d.fecha).toLocaleDateString('es-MX', { dateStyle: 'long' })}
                    {d.creado_por_nombre ? ` · ${d.creado_por_nombre}` : ''}
                  </p>
                  {d.notas && <p className="text-sm text-gray-600 mt-1">{d.notas}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={async () => {
                      const nuevo = d.estatus === 'activo' ? 'resuelto' : 'activo';
                      try {
                        await updateDiagnostico(d.id, { estatus: nuevo });
                        cargar();
                      } catch { alert('Error al actualizar'); }
                    }}
                    className={`text-xs px-2 py-0.5 rounded-full ${d.estatus === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    title="Clic para cambiar estatus">
                    {d.estatus}
                  </button>
                  {rol === 'admin' && (
                    <button onClick={async () => {
                              if (!confirm('¿Eliminar este diagnóstico?')) return;
                              try { await deleteDiagnostico(d.id); cargar(); }
                              catch (e) { alert(e.response?.data?.error || 'Error al eliminar'); }
                            }}
                            className="text-xs text-red-400 hover:text-red-600">✕</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recetas ───────────────────────────────────────────────────────────────────
const MED_VACIO = { nombre: '', dosis: '', frecuencia: '', duracion: '' };

export function RecetasTab({ pacienteId, paciente, rol }) {
  const [recetas, setRecetas] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [modal, setModal] = useState(false);

  const cargar = () => getRecetas(pacienteId).then(setRecetas).catch(console.error);
  useEffect(() => {
    cargar();
    getDiagnosticos(pacienteId).then(setDiagnosticos).catch(() => {});
  }, [pacienteId]);

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setModal(true)} className="px-4 py-2 text-sm text-white rounded-lg" style={btnAccent}>
          + Nueva receta
        </button>
      </div>

      {recetas.length === 0 ? (
        <p className="text-sm text-gray-400">Sin recetas registradas.</p>
      ) : (
        <div className="space-y-3">
          {recetas.map(r => (
            <div key={r.id} className="bg-white rounded-xl border p-4" style={cardBorder}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                    {new Date(r.fecha).toLocaleDateString('es-MX', { dateStyle: 'long' })}
                    {r.medico_nombre ? ` · ${r.medico_nombre}` : ''}
                  </p>
                  {r.cie10_codigo && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Dx: <span className="font-mono">{r.cie10_codigo}</span> {r.cie10_descripcion}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => imprimirReceta(r, paciente)}
                          className="text-xs px-3 py-1 rounded border"
                          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                    🖨 Imprimir
                  </button>
                  {rol === 'admin' && (
                    <button onClick={async () => {
                              if (!confirm('¿Eliminar esta receta?')) return;
                              try { await deleteReceta(r.id); cargar(); } catch { alert('Error al eliminar'); }
                            }}
                            className="text-xs text-red-400 hover:text-red-600">✕</button>
                  )}
                </div>
              </div>
              <ul className="mt-2 text-sm text-gray-700 list-disc pl-5">
                {(r.medicamentos || []).map((m, i) => (
                  <li key={i}>
                    <span className="font-medium">{m.nombre}</span>
                    {[m.dosis, m.frecuencia, m.duracion].filter(Boolean).length > 0 &&
                      ` — ${[m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(', ')}`}
                  </li>
                ))}
              </ul>
              {r.indicaciones && <p className="text-sm text-gray-500 mt-2 italic">{r.indicaciones}</p>}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <RecetaModal pacienteId={pacienteId} diagnosticos={diagnosticos}
                     onClose={() => setModal(false)}
                     onSaved={() => { setModal(false); cargar(); }} />
      )}
    </div>
  );
}

function RecetaModal({ pacienteId, diagnosticos, onClose, onSaved }) {
  const [meds, setMeds] = useState([{ ...MED_VACIO }]);
  const [diagnosticoId, setDiagnosticoId] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setMed = (i, k, v) => setMeds(ms => ms.map((m, j) => j === i ? { ...m, [k]: v } : m));

  async function guardar(e) {
    e.preventDefault();
    const validos = meds.filter(m => m.nombre.trim());
    if (!validos.length) { setError('Agrega al menos un medicamento'); return; }
    setLoading(true); setError('');
    try {
      await createReceta({
        paciente_id: pacienteId,
        diagnostico_id: diagnosticoId || null,
        medicamentos: validos,
        indicaciones: indicaciones.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-dark)' }}>Nueva receta</h2>
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Diagnóstico (CIE-10)</label>
            <select value={diagnosticoId} onChange={e => setDiagnosticoId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-primary)' }}>
              <option value="">— Sin diagnóstico vinculado —</option>
              {diagnosticos.map(d => (
                <option key={d.id} value={d.id}>{d.cie10_codigo} · {d.cie10_descripcion}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Medicamentos</label>
            <div className="space-y-2">
              {meds.map((m, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                  <input placeholder="Medicamento" value={m.nombre} onChange={e => setMed(i, 'nombre', e.target.value)}
                         className="border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
                  <input placeholder="Dosis" value={m.dosis} onChange={e => setMed(i, 'dosis', e.target.value)}
                         className="border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
                  <input placeholder="Frecuencia" value={m.frecuencia} onChange={e => setMed(i, 'frecuencia', e.target.value)}
                         className="border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
                  <input placeholder="Duración" value={m.duracion} onChange={e => setMed(i, 'duracion', e.target.value)}
                         className="border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
                  <button type="button" onClick={() => setMeds(ms => ms.length > 1 ? ms.filter((_, j) => j !== i) : ms)}
                          className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setMeds(ms => [...ms, { ...MED_VACIO }])}
                    className="text-xs mt-2" style={{ color: 'var(--color-accent)' }}>
              + Agregar medicamento
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">Indicaciones generales</label>
              <BotonDictado onTexto={t => setIndicaciones(v => (v ? v + ' ' : '') + t)} />
            </div>
            <textarea rows={3} value={indicaciones} onChange={e => setIndicaciones(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-primary)' }} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-primary)' }}>Cancelar</button>
            <button type="submit" disabled={loading}
                    className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50" style={btnAccent}>
              {loading ? 'Guardando…' : 'Guardar receta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Imprime sobre el machote oficial RECETA-GV (media carta horizontal, 8.5×5.5 in).
// El PDF original se renderizó a receta-gv.jpg; los campos van posicionados en % sobre el fondo.
function imprimirReceta(r, paciente) {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nombrePaciente = esc([paciente.apellido_paterno, paciente.apellido_materno, paciente.nombre].filter(Boolean).join(' '));
  const meds = (r.medicamentos || []).map((m, i) => `
    <p class="med">${i + 1}. <strong>${esc(m.nombre)}</strong>${[m.dosis, m.frecuencia, m.duracion].filter(Boolean).length
      ? ' — ' + [m.dosis, m.frecuencia, m.duracion].filter(Boolean).map(esc).join(', ') : ''}</p>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receta — ${nombrePaciente}</title>
    <style>
      @page { size: 8.5in 5.5in; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif; color: #574d5c; }
      .hoja { position: relative; width: 8.5in; height: 5.5in; overflow: hidden; }
      .hoja img.fondo { position: absolute; inset: 0; width: 100%; height: 100%; }
      .campo { position: absolute; font-size: 10.5pt; white-space: nowrap; }
      .fecha    { left: 9%;    bottom: 71.5%; width: 14%; }
      .nombre   { left: 40%;   bottom: 71.5%; width: 42%; overflow: hidden; text-overflow: ellipsis; }
      .edad     { left: 89%;   bottom: 71.5%; width: 8%; }
      .dx       { left: 14.5%; bottom: 66.3%; width: 82%; overflow: hidden; text-overflow: ellipsis; }
      .cuerpo   { position: absolute; left: 6%; top: 39%; width: 88%; height: 42%; font-size: 10.5pt; line-height: 1.5; overflow: hidden; }
      .med { margin-bottom: 2pt; }
      .indicaciones { margin-top: 6pt; font-style: italic; font-size: 9.5pt; }
    </style></head><body>
    <div class="hoja">
      <img class="fondo" src="${recetaFondo}" alt="" />
      <span class="campo fecha">${new Date(r.fecha).toLocaleDateString('es-MX')}</span>
      <span class="campo nombre">${nombrePaciente}</span>
      <span class="campo edad">${paciente.edad ? paciente.edad + ' años' : ''}</span>
      <span class="campo dx">${r.cie10_codigo ? esc(r.cie10_codigo) + ' — ' + esc(r.cie10_descripcion || '') : ''}</span>
      <div class="cuerpo">
        ${meds}
        ${r.indicaciones ? `<p class="indicaciones">${esc(r.indicaciones)}</p>` : ''}
      </div>
    </div>
    <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
    </body></html>`);
  w.document.close();
}

// ── Notas médicas libres ──────────────────────────────────────────────────────
export function NotasMedicasTab({ pacienteId, rol }) {
  const [notas, setNotas] = useState([]);
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState(null); // { id, contenido }
  const [loading, setLoading] = useState(false);

  const cargar = () => getNotasMedicas(pacienteId).then(setNotas).catch(console.error);
  useEffect(() => { cargar(); }, [pacienteId]);

  async function guardarNueva() {
    if (!nueva.trim()) return;
    setLoading(true);
    try {
      await createNotaMedica({ paciente_id: pacienteId, contenido: nueva.trim() });
      setNueva(''); cargar();
    } catch (e) { alert(e.response?.data?.error || 'Error al guardar'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="bg-white rounded-xl border p-4 mb-4" style={cardBorder}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>Nueva nota médica</p>
          <BotonDictado onTexto={t => setNueva(v => (v ? v + ' ' : '') + t)} />
        </div>
        <textarea rows={4} value={nueva} onChange={e => setNueva(e.target.value)}
                  placeholder="Escribe o dicta la nota médica…"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-primary)' }} />
        <div className="flex justify-end mt-2">
          <button onClick={guardarNueva} disabled={loading || !nueva.trim()}
                  className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50" style={btnAccent}>
            {loading ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>
      </div>

      {notas.length === 0 ? (
        <p className="text-sm text-gray-400">Sin notas médicas registradas.</p>
      ) : (
        <div className="space-y-3">
          {notas.map(n => (
            <div key={n.id} className="bg-white rounded-xl border p-4" style={cardBorder}>
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs text-gray-400">
                  {new Date(n.created_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                  {n.creado_por_nombre ? ` · ${n.creado_por_nombre}` : ''}
                  {n.updated_at !== n.created_at ? ' · editada' : ''}
                </p>
                <div className="flex gap-2">
                  {editando?.id !== n.id && (
                    <button onClick={() => setEditando({ id: n.id, contenido: n.contenido })}
                            className="text-xs" style={{ color: 'var(--color-accent)' }}>Editar</button>
                  )}
                  {rol === 'admin' && (
                    <button onClick={async () => {
                              if (!confirm('¿Eliminar esta nota?')) return;
                              try { await deleteNotaMedica(n.id); cargar(); } catch { alert('Error al eliminar'); }
                            }}
                            className="text-xs text-red-400 hover:text-red-600">✕</button>
                  )}
                </div>
              </div>
              {editando?.id === n.id ? (
                <div>
                  <div className="flex justify-end mb-1">
                    <BotonDictado onTexto={t => setEditando(ed => ({ ...ed, contenido: (ed.contenido ? ed.contenido + ' ' : '') + t }))} />
                  </div>
                  <textarea rows={4} value={editando.contenido}
                            onChange={e => setEditando(ed => ({ ...ed, contenido: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            style={{ borderColor: 'var(--color-primary)' }} />
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => setEditando(null)} className="text-xs px-3 py-1 border rounded-lg"
                            style={{ borderColor: 'var(--color-primary)' }}>Cancelar</button>
                    <button onClick={async () => {
                              try {
                                await updateNotaMedica(n.id, editando.contenido.trim());
                                setEditando(null); cargar();
                              } catch (e) { alert(e.response?.data?.error || 'Error al guardar'); }
                            }}
                            className="text-xs px-3 py-1 text-white rounded-lg" style={btnAccent}>Guardar</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.contenido}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Archivos ──────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  ['foto', 'Foto'],
  ['laboratorio', 'Laboratorio'],
  ['expediente_externo', 'Expediente externo'],
  ['poliza_seguro', 'Póliza de seguro'],
  ['otro', 'Otro'],
];
const CATEGORIAS_RECEPCION = ['poliza_seguro', 'otro'];
const esImagen = (archivo) => /\.(jpe?g|png|webp|heic)$/i.test(archivo);

export function ArchivosTab({ pacienteId, rol }) {
  const [archivos, setArchivos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const cargar = () => getArchivos(pacienteId).then(setArchivos).catch(console.error);
  useEffect(() => { cargar(); }, [pacienteId]);

  const visibles = filtro ? archivos.filter(a => a.categoria === filtro) : archivos;
  const etiqueta = (cat) => CATEGORIAS.find(([k]) => k === cat)?.[1] || cat;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFiltro('')}
                  className={`text-xs px-3 py-1 rounded-full border ${!filtro ? 'text-white' : ''}`}
                  style={!filtro ? { ...btnAccent, borderColor: 'var(--color-accent)' } : { borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
            Todos {archivos.length ? `(${archivos.length})` : ''}
          </button>
          {CATEGORIAS.map(([k, label]) => {
            const count = archivos.filter(a => a.categoria === k).length;
            if (!count) return null;
            return (
              <button key={k} onClick={() => setFiltro(k)}
                      className={`text-xs px-3 py-1 rounded-full border ${filtro === k ? 'text-white' : ''}`}
                      style={filtro === k ? { ...btnAccent, borderColor: 'var(--color-accent)' } : { borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
                {label} ({count})
              </button>
            );
          })}
        </div>
        <button onClick={() => setModal(true)} className="px-4 py-2 text-sm text-white rounded-lg" style={btnAccent}>
          + Subir archivo
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-gray-400">Sin archivos.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {visibles.map(a => (
            <div key={a.id} className="bg-white rounded-xl border p-3" style={cardBorder}>
              {esImagen(a.archivo) ? (
                <img src={archivoUrl(a.archivo)} alt={a.nombre}
                     className="w-full h-32 object-cover rounded-lg cursor-pointer mb-2"
                     onClick={() => setLightbox(archivoUrl(a.archivo))} />
              ) : (
                <a href={archivoUrl(a.archivo)} target="_blank" rel="noopener noreferrer"
                   className="w-full h-32 rounded-lg mb-2 flex items-center justify-center text-4xl"
                   style={{ backgroundColor: 'var(--color-cream)' }}>
                  📄
                </a>
              )}
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-dark)' }} title={a.nombre}>{a.nombre}</p>
              <p className="text-xs text-gray-400">
                {etiqueta(a.categoria)} · {new Date(a.fecha || a.created_at).toLocaleDateString('es-MX')}
              </p>
              {a.notas && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.notas}</p>}
              <div className="flex gap-2 mt-2">
                <a href={archivoUrl(a.archivo)} target="_blank" rel="noopener noreferrer"
                   className="text-xs" style={{ color: 'var(--color-accent)' }}>Ver</a>
                {rol === 'admin' && (
                  <button onClick={async () => {
                            if (!confirm('¿Eliminar este archivo?')) return;
                            try { await deleteArchivo(a.id); cargar(); } catch { alert('Error al eliminar'); }
                          }}
                          className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ArchivoModal pacienteId={pacienteId} rol={rol}
                      onClose={() => setModal(false)}
                      onSaved={() => { setModal(false); cargar(); }} />
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="archivo" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function ArchivoModal({ pacienteId, rol, onClose, onSaved }) {
  const cats = rol === 'asistente_general'
    ? CATEGORIAS.filter(([k]) => CATEGORIAS_RECEPCION.includes(k))
    : CATEGORIAS;
  const [form, setForm] = useState({ categoria: cats[0][0], nombre: '', fecha: '', notas: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function guardar(e) {
    e.preventDefault();
    if (!file) { setError('Selecciona un archivo'); return; }
    if (!form.nombre.trim()) { setError('Escribe un nombre'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('paciente_id', pacienteId);
      fd.append('categoria', form.categoria);
      fd.append('nombre', form.nombre.trim());
      if (form.fecha) fd.append('fecha', form.fecha);
      if (form.notas.trim()) fd.append('notas', form.notas.trim());
      fd.append('archivo', file);
      await uploadArchivo(fd);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <form onSubmit={guardar} className="p-6 space-y-3">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-dark)' }}>Subir archivo</h2>
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }}>
              {cats.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre / descripción</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                   placeholder="Ej. Biometría hemática, Póliza GNP 2026…"
                   className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha del documento (opcional)</label>
            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                   className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
            <textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Archivo (PDF o imagen, máx. 20 MB)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
                   onChange={e => setFile(e.target.files?.[0] || null)}
                   className="w-full text-sm" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-primary)' }}>Cancelar</button>
            <button type="submit" disabled={loading}
                    className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50" style={btnAccent}>
              {loading ? 'Subiendo…' : 'Subir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
