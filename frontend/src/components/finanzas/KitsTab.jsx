import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getKits, getKit, updateKitItem, updateInsumo } from '../../api/insumos';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function KitsTab() {
  const [kits,     setKits]     = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [detail,   setDetail]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [editing,  setEditing]  = useState(null); // { kitId, itemId, field, value }

  useEffect(() => {
    setError(null);
    getKits()
      .then(setKits)
      .catch(e => setError(e.message || 'Error al cargar kits'))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(kitId) {
    if (expanded === kitId) { setExpanded(null); return; }
    setExpanded(kitId);
    if (!detail[kitId]) {
      try {
        const data = await getKit(kitId);
        setDetail(p => ({ ...p, [kitId]: data }));
      } catch (e) {
        setError(e.message || 'Error al cargar detalle del kit');
      }
    }
  }

  async function saveItem(kitId, itemId, insumoId, field, rawVal) {
    const val = parseFloat(rawVal);
    if (!val || val <= 0) { setEditing(null); return; }
    try {
      if (field === 'cantidad') {
        await updateKitItem(kitId, itemId, { cantidad: val });
      } else {
        await updateInsumo(insumoId, { costo_unidad: val });
      }
      const data = await getKit(kitId);
      setDetail(p => ({ ...p, [kitId]: data }));
      setKits(ks => ks.map(k => k.id === kitId ? { ...k, costo_cabina: data.costo_cabina } : k));
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setEditing(null);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando kits…</div>;
  if (error)   return <div className="text-red-400 py-6 text-center">{error}</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-4">
        Costo de cabina = costo real de insumos por sesión. Click en <strong className="text-gray-400">Cantidad</strong> para editar.
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {detail[kit.id].items.map(item => {
                    return (
                      <tr key={item.id}>
                        <td className="py-1.5 text-gray-300">{item.nombre}</td>
                        {['costo_unidad', 'cantidad'].map(field => {
                          const isEditingCell = editing?.kitId === kit.id && editing?.itemId === item.id && editing?.field === field;
                          const val = field === 'costo_unidad' ? item.costo_unidad : item.cantidad;
                          return (
                            <td key={field} className="py-1.5 text-right">
                              {isEditingCell ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  autoFocus
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
                      </tr>
                    );
                  })}
                  <tr className="border-t border-gray-600">
                    <td colSpan={4} className="py-2 text-right font-semibold text-gray-300">Total costo cabina</td>
                    <td className="py-2 text-right font-bold" style={{ color: '#aba3ba' }}>
                      {fmt(detail[kit.id].costo_cabina)}
                    </td>
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
