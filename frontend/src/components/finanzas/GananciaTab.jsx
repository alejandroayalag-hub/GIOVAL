import { useState, useEffect } from 'react';
import { getGananciaTratamientos } from '../../api/finanzas';

const fmt  = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
const fmtP = n => `${parseFloat(n || 0).toFixed(1)}%`;

const margenColor = m => m >= 50 ? '#4a7c6a' : m >= 25 ? '#c07030' : '#c0675a';

export default function GananciaTab() {
  const hoy = new Date().toISOString().slice(0, 7);
  const [mes, setMes]         = useState(hoy);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    getGananciaTratamientos(mes)
      .then(setData)
      .catch(e => setError(e.response?.data?.error || 'Error al cargar reporte'))
      .finally(() => setLoading(false));
  }, [mes]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Mes:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
               className="border rounded-lg px-3 py-1.5 text-sm"
               style={{ borderColor: 'var(--color-sage)' }} />
      </div>

      {loading && <p className="text-center text-gray-400 py-12 text-sm">Cargando reporte…</p>}
      {!loading && error && <p className="text-center text-red-400 py-6 text-sm">{error}</p>}

      {!loading && data && (
        <>
          {/* Totales del mes */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Citas cobradas', val: data.totales.citas, raw: true },
              { label: 'Ingreso',        val: fmt(data.totales.ingreso), color: '#4a7c6a' },
              { label: 'Costo insumos',  val: fmt(data.totales.costo_insumos), color: '#c0675a' },
              { label: 'Ganancia',       val: fmt(data.totales.ganancia), color: 'var(--color-dark)' },
              { label: 'Margen',         val: fmtP(data.totales.margen), color: margenColor(data.totales.margen) },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white rounded-xl border p-4 text-center"
                   style={{ borderColor: 'var(--color-sage)' }}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: color || 'var(--color-dark)' }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Tabla por tratamiento */}
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-sage)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--color-primary)' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--color-dark)' }}>
                Ganancia por tratamiento — {mes}
              </span>
            </div>
            {data.tratamientos.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center text-gray-400">
                Sin citas cobradas con precio registrado este mes
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b" style={{ borderColor: 'var(--color-sage)' }}>
                      <th className="text-left px-5 py-2 font-medium">Tratamiento</th>
                      <th className="text-right px-3 py-2 font-medium">Citas</th>
                      <th className="text-right px-3 py-2 font-medium">Ingreso</th>
                      <th className="text-right px-3 py-2 font-medium">Costo insumos</th>
                      <th className="text-right px-3 py-2 font-medium">Ganancia</th>
                      <th className="text-right px-5 py-2 font-medium">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-sage)' }}>
                    {data.tratamientos.map(t => (
                      <tr key={t.tratamiento_id}>
                        <td className="px-5 py-2.5" style={{ color: 'var(--color-dark)' }}>
                          {t.tratamiento}
                          {t.citas_sin_insumos > 0 && (
                            <span className="text-xs text-gray-400 ml-2"
                                  title="Citas sin consumo de insumos confirmado — costo real puede ser mayor">
                              ⚠ {t.citas_sin_insumos} sin insumos
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{t.citas}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: '#4a7c6a' }}>{fmt(t.ingreso)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: '#c0675a' }}>{fmt(t.costo_insumos)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: 'var(--color-dark)' }}>{fmt(t.ganancia)}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-semibold" style={{ color: margenColor(t.margen) }}>{fmtP(t.margen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Solo incluye citas cobradas con precio registrado (desde jul 2026). El costo usa el snapshot
            de costo por unidad al momento de confirmar el consumo. ⚠ = citas sin consumo confirmado, su costo aparece en $0.
          </p>
        </>
      )}
    </div>
  );
}
