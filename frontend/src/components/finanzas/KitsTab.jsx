import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { getKits, getKit, updateKitItem, updateInsumo, getInsumos, addKitItem, removeKitItem } from '../../api/insumos';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function KitsTab() {
  const [kits,     setKits]     = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [detail,   setDetail]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [editing,  setEditing]  = useState(null); // { kitId, itemId, field, value }
  const [insumos,  setInsumos]  = useState([]);    // catálogo para el selector
  const [adding,   setAdding]   = useState(null);  // { kitId, insumo_id, cantidad, unidad }

  useEffect(() => {
    setError(null);
    Promise.all([getKits(), getInsumos()])
      .then(([ks, ins]) => { setKits(ks); setInsumos(ins); })
      .catch(e => setError(e.message || 'Error al cargar kits'))
      .finally(() => setLoading(false));
  }, []);

  async function refreshKit(kitId) {
    const data = await getKit(kitId);
    setDetail(p => ({ ...p, [kitId]: data }));
    setKits(ks => ks.map(k => k.id === kitId ? { ...k, costo_cabina: data.costo_cabina } : k));
  }

  async function toggle(kitId) {
    if (expanded === kitId) { setExpanded(null); return; }
    setExpanded(kitId);
    if (!detail[kitId]) {
      try { await refreshKit(kitId); }
      catch (e) { setError(e.message || 'Error al cargar detalle del kit'); }
    }
  }

  async function saveItem(kitId, itemId, insumoId, field, rawVal) {
    const val = parseFloat(rawVal);
    if (!val || val <= 0) { setEditing(null); return; }
    try {
      if (field === 'cantidad') await updateKitItem(kitId, itemId, { cantidad: val });
      else                      await updateInsumo(insumoId, { costo_unidad: val });
      await refreshKit(kitId);
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setEditing(null);
    }
  }

  async function addProduct(kitId) {
    if (!adding?.insumo_id || !adding?.cantidad || parseFloat(adding.cantidad) <= 0) return;
    try {
      await addKitItem(kitId, {
        insumo_id: parseInt(adding.insumo_id),
        cantidad: parseFloat(adding.cantidad),
        unidad: adding.unidad || null,
      });
      await refreshKit(kitId);
      setAdding(null);
    } catch (e) {
      setError(e.message || 'Error al agregar producto');
    }
  }

  async function delItem(kitId, itemId) {
    if (!confirm('¿Quitar este producto del kit?')) return;
    try {
      await removeKitItem(kitId, itemId);
      await refreshKit(kitId);
    } catch (e) {
      setError(e.message || 'Error al quitar producto');
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando kits…</div>;
  if (error)   return <div className="text-red-400 py-6 text-center">{error}</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-4">
        Costo de cabina = costo real de insumos por sesión. Click en <strong className="text-gray-400">Cantidad</strong> para editar,
        o <strong className="text-gray-400">＋ Agregar producto</strong> para sumar un insumo al kit.
      </p>
      {kits.map(kit => (
        <div key={kit.id} className="rounded-xl border border-gray-700 overflow-hidden">
          <button
            onClick={() => toggle(kit.id)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 text-left"
          >
            <span className="flex items-center gap-2">
              {expanded === kit.id
                ? <ChevronDown size={14} className="text-gray-400"/>
                : <ChevronRight size={14} className="text-gray-400"/>}
              <span className="text-sm font-medium text-white">{kit.nombre}</span>
            </span>
            <span className="text-sm font-bold" style={{ color: '#aba3ba' }}>
              Costo: {fmt(kit.costo_cabina)}
            </span>
          </button>

          {expanded === kit.id && detail[kit.id] && (
            <div className="bg-gray-900 px-4 pb-3">
              <table className="w-full text-xs mt-2">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="py-1.5 text-left">Insumo</th>
                    <th className="py-1.5 text-right">Costo/Unidad <span className="text-gray-600">(editable)</span></th>
                    <th className="py-1.5 text-right">Cantidad <span className="text-gray-600">(editable)</span></th>
                    <th className="py-1.5 text-right">Unidad</th>
                    <th className="py-1.5 text-right">Costo/Sesión</th>
                    <th className="py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {detail[kit.id].items.map(item => (
                    <tr key={item.id}>
                      <td className="py-1.5 text-gray-300">{item.nombre}</td>
                      {['costo_unidad', 'cantidad'].map(field => {
                        const isEditingCell = editing?.kitId === kit.id && editing?.itemId === item.id && editing?.field === field;
                        const val = field === 'costo_unidad' ? item.costo_unidad : item.cantidad;
                        return (
                          <td key={field} className="py-1.5 text-right">
                            {isEditingCell ? (
                              <input
                                type="number" step="0.01" min="0.01" autoFocus
                                defaultValue={editing.value}
                                className="w-20 bg-gray-700 text-white text-right text-xs px-1 py-0.5 rounded border border-purple-400 outline-none"
                                onBlur={e => saveItem(kit.id, item.id, item.insumo_id, field, e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') e.target.blur();
                                  if (e.key === 'Escape') setEditing(null);
                                }}
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:text-white text-gray-400 underline decoration-dotted"
                                onClick={() => setEditing({ kitId: kit.id, itemId: item.id, field, value: val })}
                              >
                                {field === 'costo_unidad' ? fmt(val) : val}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-1.5 text-right text-gray-400">{item.unidad}</td>
                      <td className="py-1.5 text-right text-white">{fmt(item.costo_sesion)}</td>
                      <td className="py-1.5 text-right">
                        <button onClick={() => delItem(kit.id, item.id)}
                                className="text-gray-600 hover:text-red-400" title="Quitar del kit">
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Fila para agregar producto */}
                  {adding?.kitId === kit.id ? (
                    <tr className="bg-gray-800/40">
                      <td className="py-2">
                        <select
                          autoFocus
                          value={adding.insumo_id}
                          onChange={e => setAdding(p => ({ ...p, insumo_id: e.target.value }))}
                          className="w-full bg-gray-700 text-white text-xs px-1 py-1 rounded border border-gray-600 outline-none"
                        >
                          <option value="">— Selecciona insumo —</option>
                          {insumos.map(i => (
                            <option key={i.id} value={i.id}>{i.codigo} · {i.nombre}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 text-right text-gray-600 text-xs">auto</td>
                      <td className="py-2 text-right">
                        <input
                          type="number" step="0.0001" min="0.0001" placeholder="cant."
                          value={adding.cantidad}
                          onChange={e => setAdding(p => ({ ...p, cantidad: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') addProduct(kit.id); if (e.key === 'Escape') setAdding(null); }}
                          className="w-16 bg-gray-700 text-white text-right text-xs px-1 py-0.5 rounded border border-gray-600 outline-none"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <input
                          type="text" placeholder="mL"
                          value={adding.unidad}
                          onChange={e => setAdding(p => ({ ...p, unidad: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') addProduct(kit.id); if (e.key === 'Escape') setAdding(null); }}
                          className="w-14 bg-gray-700 text-white text-right text-xs px-1 py-0.5 rounded border border-gray-600 outline-none"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => addProduct(kit.id)} className="text-green-400 hover:text-green-300 text-xs font-medium">Guardar</button>
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => setAdding(null)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-2">
                        <button
                          onClick={() => setAdding({ kitId: kit.id, insumo_id: '', cantidad: '', unidad: '' })}
                          className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200"
                        >
                          <Plus size={13}/> Agregar producto
                        </button>
                      </td>
                    </tr>
                  )}

                  <tr className="border-t border-gray-600">
                    <td colSpan={4} className="py-2 text-right font-semibold text-gray-300">Total costo cabina</td>
                    <td className="py-2 text-right font-bold" style={{ color: '#aba3ba' }}>
                      {fmt(detail[kit.id].costo_cabina)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
