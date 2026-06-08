// frontend/src/components/finanzas/ReportesFinanzas.jsx
import { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getResumenMovimientos } from '../../api/finanzas';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

function getRangoPreset(preset) {
  const hoy = new Date();
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (preset === 'mes_actual') {
    return { inicio: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fin: iso(hoy) };
  }
  if (preset === 'mes_anterior') {
    return {
      inicio: iso(new Date(hoy.getFullYear(), hoy.getMonth()-1, 1)),
      fin:    iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
    };
  }
  if (preset === 'trimestre') {
    const q = Math.floor(hoy.getMonth() / 3);
    return { inicio: iso(new Date(hoy.getFullYear(), q*3, 1)), fin: iso(hoy) };
  }
  return { inicio: '', fin: '' };
}

export default function ReportesFinanzas() {
  const [periodo,     setPeriodo]     = useState('mes_actual');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin,    setFechaFin]    = useState('');
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [exportando,  setExportando]  = useState(false);
  const reporteRef = useRef(null);

  async function cargar() {
    const rango = periodo === 'personalizado'
      ? { inicio: fechaInicio, fin: fechaFin }
      : getRangoPreset(periodo);
    if (!rango.inicio || !rango.fin) return;
    setLoading(true);
    try {
      setData(await getResumenMovimientos({ fecha_inicio: rango.inicio, fecha_fin: rango.fin }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function exportarPDF() {
    if (!reporteRef.current) return;
    setExportando(true);
    try {
      const canvas = await html2canvas(reporteRef.current, { scale: 2, useCORS: true });
      const img  = canvas.toDataURL('image/png');
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const ancho = pdf.internal.pageSize.getWidth() - 20;
      const alto  = (canvas.height * ancho) / canvas.width;
      pdf.addImage(img, 'PNG', 10, 10, ancho, alto);
      const rango = periodo === 'personalizado'
        ? { inicio: fechaInicio, fin: fechaFin }
        : getRangoPreset(periodo);
      pdf.save(`finanzas_${rango.inicio}_${rango.fin}.pdf`);
    } finally { setExportando(false); }
  }

  const totalIngresos = data?.porCategoria?.filter(r => r.tipo === 'ingreso')
    .reduce((a, r) => a + parseFloat(r.total), 0) || 0;
  const totalEgresos  = data?.porCategoria?.filter(r => r.tipo === 'egreso')
    .reduce((a, r) => a + parseFloat(r.total), 0) || 0;

  const graficaData = data?.porMes?.map(r => ({
    mes: r.mes, Ingresos: parseFloat(r.ingresos), Egresos: parseFloat(r.egresos),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
            Período
          </label>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-sage)' }}
            value={periodo} onChange={e => setPeriodo(e.target.value)}
          >
            <option value="mes_actual">Mes actual</option>
            <option value="mes_anterior">Mes anterior</option>
            <option value="trimestre">Trimestre actual</option>
            <option value="personalizado">Rango personalizado</option>
          </select>
        </div>

        {periodo === 'personalizado' && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>Desde</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                     className="border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-sage)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>Hasta</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                     className="border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-sage)' }} />
            </div>
          </>
        )}

        <button onClick={cargar} disabled={loading}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: 'var(--color-accent)' }}>
          {loading ? 'Cargando…' : 'Ver reporte'}
        </button>

        {data && (
          <button onClick={exportarPDF} disabled={exportando}
                  className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
            <Download className="w-4 h-4" />
            {exportando ? 'Exportando…' : 'Exportar PDF'}
          </button>
        )}
      </div>

      {data && (
        <div ref={reporteRef} className="space-y-6">
          {/* Gráfica de barras */}
          {graficaData.length > 0 && (
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--color-sage)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-dark)' }}>
                Ingresos vs Egresos por mes
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={graficaData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ced1ca" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#4a7c6a" radius={[4,4,0,0]} />
                  <Bar dataKey="Egresos"  fill="#c0675a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabla desglose por categoría */}
          <div className="bg-white rounded-xl border overflow-hidden"
               style={{ borderColor: 'var(--color-sage)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-primary)' }}>
                <tr>
                  {['Categoría','Tipo','Cantidad','Total'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.porCategoria?.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                              style={{ backgroundColor: r.color || '#887482' }} />
                        {r.categoria || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: r.tipo === 'ingreso' ? '#4a7c6a' : '#c0675a' }}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.cantidad}</td>
                    <td className="px-4 py-2 font-medium"
                        style={{ color: r.tipo === 'ingreso' ? '#4a7c6a' : '#c0675a' }}>
                      {fmt(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ backgroundColor: 'var(--color-primary)' }}>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-xs font-semibold"
                      style={{ color: 'var(--color-dark)' }}>Saldo del período</td>
                  <td className="px-4 py-2 font-bold"
                      style={{ color: (totalIngresos - totalEgresos) >= 0 ? '#4a7c6a' : '#c0675a' }}>
                    {fmt(totalIngresos - totalEgresos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
