import { useState, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { getInsumos, getCategoriasInsumos, updateInsumo } from '../../api/insumos';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function InsumosTab() {
  const [insumos,    setInsumos]    = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtro,     setFiltro]     = useState('');
  const [editing,    setEditing]    = useState(null); // { id, field, value }
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    setError(null);
    Promise.all([getInsumos(), getCategoriasInsumos()])
      .then(([ins, cats]) => { setInsumos(ins); setCategorias(cats); })
      .catch(e => setError(e.message || 'Error al cargar insumos'))
      .finally(() => setLoading(false));
  }, []);

  const displayed = filtro
    ? insumos.filter(i => i.categoria === filtro)
    : insumos;

  async function saveEdit(insumo) {
    if (!editing) return;
    try {
      await updateInsumo(insumo.id, { [editing.field]: parseFloat(editing.value) || editing.value });
      setInsumos(prev => prev.map(i => i.id === insumo.id ? { ...i, [editing.field]: editing.value } : i));
    } catch (e) {
      setError(e.message || 'Error al guardar');
    }
    setEditing(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando insumos…</div>;

  if (error) return <div className="text-red-400 py-6 text-center">{error}</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-400">Categoría:</label>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white"
        >
          <option value="">Todas ({insumos.length})</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500">{displayed.length} insumos</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Presentación</th>
              <th className="px-4 py-3 text-right">Precio Unit.</th>
              <th className="px-4 py-3 text-right">Costo/Unidad</th>
              <th className="px-4 py-3 text-right">Stock Mín.</th>
              <th className="px-4 py-3 text-right">Stock Act.</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {displayed.map(ins => (
              <tr key={ins.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-2 text-gray-400 font-mono text-xs">{ins.codigo}</td>
                <td className="px-4 py-2 text-white">{ins.nombre}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{ins.presentacion}</td>
                <td className="px-4 py-2 text-right text-gray-300">{fmt(ins.precio_unitario)}</td>
                <td className="px-4 py-2 text-right text-gray-300">{fmt(ins.costo_unidad)}</td>
                {/* Editable: stock_minimo */}
                <td className="px-4 py-2 text-right">
                  {editing?.id === ins.id && editing.field === 'stock_minimo' ? (
                    <span className="flex items-center justify-end gap-1">
                      <input type="number" value={editing.value} min={0}
                        onChange={e => setEditing(p => ({ ...p, value: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(ins); if (e.key === 'Escape') setEditing(null); }}
                        onBlur={() => saveEdit(ins)}
                        autoFocus
                        className="w-16 text-right text-sm bg-gray-700 border border-gray-500 rounded px-1 text-white"
                      />
                      <button onClick={() => saveEdit(ins)} className="text-green-400 hover:text-green-300"><Check size={14}/></button>
                      <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-1 cursor-pointer group"
                          onClick={() => setEditing({ id: ins.id, field: 'stock_minimo', value: ins.stock_minimo })}>
                      <span className="text-gray-300">{ins.stock_minimo}</span>
                      <Pencil size={11} className="text-gray-600 group-hover:text-gray-400"/>
                    </span>
                  )}
                </td>
                {/* Editable: stock_actual */}
                <td className="px-4 py-2 text-right">
                  {editing?.id === ins.id && editing.field === 'stock_actual' ? (
                    <span className="flex items-center justify-end gap-1">
                      <input type="number" value={editing.value ?? ''} min={0}
                        onChange={e => setEditing(p => ({ ...p, value: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(ins); if (e.key === 'Escape') setEditing(null); }}
                        onBlur={() => saveEdit(ins)}
                        autoFocus
                        className="w-16 text-right text-sm bg-gray-700 border border-gray-500 rounded px-1 text-white"
                      />
                      <button onClick={() => saveEdit(ins)} className="text-green-400 hover:text-green-300"><Check size={14}/></button>
                      <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-1 cursor-pointer group"
                          onClick={() => setEditing({ id: ins.id, field: 'stock_actual', value: ins.stock_actual ?? '' })}>
                      <span className={ins.stock_actual !== null && ins.stock_actual <= ins.stock_minimo ? 'text-red-400' : 'text-gray-300'}>
                        {ins.stock_actual ?? '—'}
                      </span>
                      <Pencil size={11} className="text-gray-600 group-hover:text-gray-400"/>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
