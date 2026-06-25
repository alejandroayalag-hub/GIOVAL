import { useState, useEffect } from 'react';
import { getEstadoResultados } from '../../api/finanzas';

const fmt  = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fmtP = n => `${parseFloat(n || 0).toFixed(1)}%`;

function Row({ label, value, bold, indent, positive, negative, percent }) {
  const color = positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-gray-300';
  return (
    <tr className="border-b border-gray-700">
      <td className={`py-2 text-sm ${indent ? 'pl-6 text-gray-400' : bold ? 'font-semibold text-gray-200' : 'text-gray-300'}`}>{label}</td>
      <td className={`py-2 text-right text-sm ${bold ? 'font-bold' : ''} ${color}`}>
        {percent ? fmtP(value) : fmt(value)}
      </td>
    </tr>
  );
}

export default function EstadoResultados() {
  const hoy = new Date().toISOString().slice(0, 7);
  const [mes, setMes]     = useState(hoy);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    getEstadoResultados(mes)
      .then(d => {
        setData(d);
        setError(null);
      })
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false));
  }, [mes]);

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-400">Mes:</label>
        <input
          type="month" value={mes}
          onChange={e => setMes(e.target.value)}
          className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white"
        />
      </div>

      {loading && <div className="text-center text-gray-400 py-12">Cargando…</div>}

      {!loading && error && <div className="text-red-400 py-6 text-center">{error}</div>}

      {!loading && data && (
        <div className="rounded-xl overflow-hidden border border-gray-700">
          <div className="bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-200">
            Estado de Resultados — {data.mes}
          </div>
          <table className="w-full bg-gray-900">
            <tbody>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <td colSpan={2} className="py-1.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ingresos</td>
              </tr>
              <Row label="Ingresos brutos por servicios" value={data.ingresos_brutos} indent />
              <Row label="(-) IVA estimado 16%" value={data.iva_estimado} indent />
              <Row label="▶ Ingresos netos" value={data.ingresos_netos} bold positive />

              <tr className="border-b border-gray-700 bg-gray-800/50">
                <td colSpan={2} className="py-1.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Costo de ventas</td>
              </tr>
              <Row label="(-) Costo materiales e insumos" value={data.costo_materiales} indent />
              <Row label="▶ Utilidad bruta" value={data.utilidad_bruta} bold positive={data.utilidad_bruta >= 0} negative={data.utilidad_bruta < 0} />

              <tr className="border-b border-gray-700 bg-gray-800/50">
                <td colSpan={2} className="py-1.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gastos operativos</td>
              </tr>
              <Row label="(-) Costos fijos (renta, servicios)" value={data.costos_fijos} indent />
              <Row label="(-) Nómina total" value={data.nomina_total} indent />
              <Row label="▶ Utilidad operativa" value={data.utilidad_operativa} bold positive={data.utilidad_operativa >= 0} negative={data.utilidad_operativa < 0} />

              <tr className="border-b border-gray-700 bg-gray-800/50">
                <td colSpan={2} className="py-1.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Indicadores</td>
              </tr>
              <Row label="Servicios realizados" value={data.servicios_realizados} indent />
              <Row label="Ticket promedio" value={data.ticket_promedio} indent />
              <Row label="Margen bruto (%)" value={data.margen_bruto} indent percent />
              <Row label="Margen neto (%)" value={data.margen_neto} indent percent />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
