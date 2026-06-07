import { useState, useEffect } from 'react';
import { getTratamientos, createTratamiento, updateTratamiento } from '../api/tratamientos';

function agrupar(items) {
  const cats = {};
  for (const t of items) {
    const cat = t.categoria || 'Sin categoría';
    if (!cats[cat]) cats[cat] = {};
    const sub = t.subcategoria || '';
    if (!cats[cat][sub]) cats[cat][sub] = [];
    cats[cat][sub].push(t);
  }
  return cats;
}

export default function TratamientosPage() {
  const rol = localStorage.getItem('rol');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nombre: '', duracion_min: 60, categoria: '', subcategoria: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandidas, setExpandidas] = useState({});

  const cargar = () => getTratamientos().then(setItems).catch(console.error);
  useEffect(() => { cargar(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      editId ? await updateTratamiento(editId, form) : await createTratamiento(form);
      setForm({ nombre: '', duracion_min: 60, categoria: '', subcategoria: '' });
      setEditId(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  function iniciarEditar(t) {
    setEditId(t.id);
    setForm({ nombre: t.nombre, duracion_min: t.duracion_min, categoria: t.categoria || '', subcategoria: t.subcategoria || '', activo: t.activo });
  }

  async function toggleActivo(t) {
    await updateTratamiento(t.id, { activo: !t.activo });
    cargar();
  }

  function toggleCat(cat) {
    setExpandidas(e => ({ ...e, [cat]: !e[cat] }));
  }

  const grupos = agrupar(items);

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--color-dark)' }}>Catálogo de Servicios</h1>

      {rol === 'admin' && (
        <form onSubmit={handleSubmit}
              className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex gap-3 items-end flex-wrap"
              style={{ borderColor: 'var(--color-sage)' }}>
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del servicio</label>
            <input type="text" required value={form.nombre}
                   onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-600 mb-1">Duración (min)</label>
            <input type="number" min="5" required value={form.duracion_min}
                   onChange={e => setForm(f => ({ ...f, duracion_min: parseInt(e.target.value) }))}
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <input type="text" value={form.categoria}
                   onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                   placeholder="ej. 01 · Medicina Estética"
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">Subcategoría</label>
            <input type="text" value={form.subcategoria}
                   onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))}
                   placeholder="ej. Toxina Botulínica / Botox"
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
              {editId ? 'Actualizar' : 'Agregar'}
            </button>
            {editId && (
              <button type="button"
                      onClick={() => { setEditId(null); setForm({ nombre: '', duracion_min: 60, categoria: '', subcategoria: '' }); }}
                      className="rounded-lg px-3 py-2 text-sm border"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-xs w-full mt-1">{error}</p>}
        </form>
      )}

      <div className="space-y-3">
        {Object.entries(grupos).map(([cat, subs]) => {
          const abierta = expandidas[cat] === true;
          const totalCat = Object.values(subs).flat().length;
          const activosCat = Object.values(subs).flat().filter(t => t.activo).length;
          return (
            <div key={cat} className="bg-white rounded-xl shadow-sm border overflow-hidden"
                 style={{ borderColor: 'var(--color-sage)' }}>
              <button onClick={() => toggleCat(cat)}
                      className="w-full flex items-center justify-between px-5 py-3 text-left"
                      style={{ backgroundColor: 'var(--color-primary)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--color-dark)' }}>{cat}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{activosCat}/{totalCat} activos</span>
                  <span style={{ color: 'var(--color-dark)' }}>{abierta ? '▲' : '▼'}</span>
                </div>
              </button>

              {abierta && (
                <div>
                  {Object.entries(subs).map(([sub, tratamientos]) => (
                    <div key={sub}>
                      {sub && (
                        <div className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wide"
                             style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-accent)' }}>
                          {sub}
                        </div>
                      )}
                      <table className="w-full text-sm">
                        <tbody>
                          {tratamientos.map((t, i) => (
                            <tr key={t.id}
                                className={`border-t ${!t.activo ? 'opacity-40' : ''}`}
                                style={{ borderColor: 'var(--color-sage)' }}>
                              <td className="px-5 py-2">{t.nombre}</td>
                              <td className="px-3 py-2 text-center text-gray-400 text-xs w-20">{t.duracion_min} min</td>
                              <td className="px-3 py-2 text-center w-20">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                  {t.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              {rol === 'admin' && (
                                <td className="px-3 py-2 w-32">
                                  <div className="flex gap-1 justify-end">
                                    <button onClick={() => iniciarEditar(t)}
                                            className="text-xs px-2 py-1 rounded border"
                                            style={{ borderColor: 'var(--color-accent)', color: 'var(--color-dark)' }}>
                                      Editar
                                    </button>
                                    <button onClick={() => toggleActivo(t)}
                                            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-400">
                                      {t.activo ? 'Off' : 'On'}
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
