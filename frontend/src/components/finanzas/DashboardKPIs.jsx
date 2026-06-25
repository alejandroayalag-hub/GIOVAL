import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart2, Wallet, ShoppingBag, Percent } from 'lucide-react';
import { getDashboardKPIs } from '../../api/finanzas';

const fmt  = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
const fmtP = n => `${parseFloat(n || 0).toFixed(1)}%`;

const KPI_CONFIG = [
  { key: 'ingresos_netos',       label: 'Ingresos Netos',       Icon: DollarSign,   color: '#4a7c6a' },
  { key: 'total_egresos',        label: 'Total Egresos',         Icon: TrendingDown, color: '#c0675a' },
  { key: 'utilidad_bruta',       label: 'Utilidad Bruta',        Icon: TrendingUp,   color: '#aba3ba' },
  { key: 'ticket_promedio',      label: 'Ticket Promedio',       Icon: Wallet,       color: '#887482' },
  { key: 'servicios_realizados', label: 'Servicios Realizados',  Icon: Users,        color: '#4a7c6a', isCount: true },
  { key: 'margen_bruto',         label: 'Margen Bruto',          Icon: Percent,      color: '#5a6aa0', isPercent: true },
  { key: 'nomina_total',         label: 'Nómina Total',          Icon: Users,        color: '#c0675a' },
  { key: 'costo_materiales',     label: 'Costo Materiales',      Icon: ShoppingBag,  color: '#887482' },
];

export default function DashboardKPIs() {
  const hoy = new Date().toISOString().slice(0, 7);
  const [mes, setMes]   = useState(hoy);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    getDashboardKPIs(mes)
      .then(d => {
        setData(d);
        setError(null);
      })
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false));
  }, [mes]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-400">Mes:</label>
        <input
          type="month"
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white"
        />
      </div>

      {loading && <div className="text-center text-gray-400 py-12">Cargando KPIs…</div>}

      {!loading && error && <div className="text-red-400 py-6 text-center">{error}</div>}

      {!loading && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_CONFIG.map(({ key, label, Icon, color, isCount, isPercent }) => (
            <div key={key} className="rounded-xl p-4 bg-gray-800 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} style={{ color }} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {isCount   ? data[key] :
                 isPercent ? fmtP(data[key]) :
                             fmt(data[key])}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data && (
        <div className="mt-4 p-3 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-400">
          💡 Regla de oro: Ingreso neto mensual debe superar 2.5× (costos fijos + nómina).
          Margen bruto &lt; 50% → revisar precios o costos de insumos.
        </div>
      )}
    </div>
  );
}
