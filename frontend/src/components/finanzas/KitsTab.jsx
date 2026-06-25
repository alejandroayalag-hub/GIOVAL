import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getKits, getKit } from '../../api/insumos';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function KitsTab() {
  const [kits,     setKits]     = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [detail,   setDetail]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

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

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando kits…</div>;

  if (error) return <div className="text-red-400 py-6 text-center">{error}</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-4">
        Costo de cabina = costo real de insumos consumidos por sesión. Click en un kit para ver el detalle.
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
                    <th className="py-1.5 text-right">Cantidad</th>
                    <th className="py-1.5 text-right">Unidad</th>
                    <th className="py-1.5 text-right">Costo/Sesión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {detail[kit.id].items.map(item => (
                    <tr key={item.id}>
                      <td className="py-1.5 text-gray-300">{item.nombre}</td>
                      <td className="py-1.5 text-right text-gray-400">{item.cantidad}</td>
                      <td className="py-1.5 text-right text-gray-400">{item.unidad}</td>
                      <td className="py-1.5 text-right text-white">{fmt(item.costo_sesion)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-600">
                    <td colSpan={3} className="py-2 text-right font-semibold text-gray-300">Total costo cabina</td>
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
