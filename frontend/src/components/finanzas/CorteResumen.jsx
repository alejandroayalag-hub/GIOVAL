// frontend/src/components/finanzas/CorteResumen.jsx
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Lock } from 'lucide-react';
import { getCorteHoy, cerrarCorte, getCortes } from '../../api/finanzas';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function CorteResumen({ rol }) {
  const [corteHoy,   setCorteHoy]   = useState(null);
  const [historial,  setHistorial]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [confirmando,setConfirmando]= useState(false);
  const [notas,      setNotas]      = useState('');
  const [cerrando,   setCerrando]   = useState(false);
  const [error,      setError]      = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const [hoy, hist] = await Promise.all([getCorteHoy(), getCortes()]);
      setCorteHoy(hoy);
      setHistorial(hist);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  async function handleCerrar() {
    setCerrando(true); setError('');
    try {
      await cerrarCorte({ notas });
      setConfirmando(false);
      setNotas('');
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cerrar corte');
    } finally { setCerrando(false); }
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>;

  return (
    <div className="space-y-6">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ingresos hoy', valor: corteHoy?.total_ingresos, color: '#4a7c6a', Icon: TrendingUp },
          { label: 'Egresos hoy',  valor: corteHoy?.total_egresos,  color: '#c0675a', Icon: TrendingDown },
          { label: 'Saldo neto',   valor: corteHoy?.saldo,
            color: (corteHoy?.saldo || 0) >= 0 ? '#4a7c6a' : '#c0675a', Icon: DollarSign },
        ].map(({ label, valor, color, Icon }) => (
          <div key={label} className="bg-white rounded-xl border p-4"
               style={{ borderColor: 'var(--color-sage)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs font-medium text-gray-500">{label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color }}>{fmt(valor)}</p>
          </div>
        ))}
      </div>

      {/* Botón / confirmación cerrar corte */}
      {rol === 'admin' && !corteHoy?.cerrado && (
        !confirmando ? (
          <button onClick={() => setConfirmando(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg"
                  style={{ backgroundColor: '#c0675a' }}>
            <Lock className="w-4 h-4" />
            Cerrar corte del día
          </button>
        ) : (
          <div className="bg-white rounded-xl border p-4 max-w-md"
               style={{ borderColor: 'var(--color-sage)' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-dark)' }}>
              ¿Confirmas cerrar el corte de hoy? Esta acción es irreversible.
            </p>
            <textarea
              placeholder="Notas opcionales…"
              value={notas} onChange={e => setNotas(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 resize-none"
              style={{ borderColor: 'var(--color-sage)' }} rows={2}
            />
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setConfirmando(false)}
                      className="flex-1 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
                Cancelar
              </button>
              <button onClick={handleCerrar} disabled={cerrando}
                      className="flex-1 py-2 text-sm text-white rounded-lg font-medium"
                      style={{ backgroundColor: '#c0675a' }}>
                {cerrando ? 'Cerrando…' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        )
      )}

      {corteHoy?.cerrado && (
        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-50"
             style={{ color: 'var(--color-accent)' }}>
          <Lock className="w-4 h-4" />
          El corte de hoy está cerrado
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-dark)' }}>
            Historial de cortes
          </h3>
          <div className="bg-white rounded-xl border overflow-hidden"
               style={{ borderColor: 'var(--color-sage)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-primary)' }}>
                <tr>
                  {['Fecha','Ingresos','Egresos','Saldo','Cerrado por'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map(c => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                    <td className="px-4 py-2">{new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-2" style={{ color: '#4a7c6a' }}>{fmt(c.total_ingresos)}</td>
                    <td className="px-4 py-2" style={{ color: '#c0675a' }}>{fmt(c.total_egresos)}</td>
                    <td className="px-4 py-2 font-medium"
                        style={{ color: parseFloat(c.saldo) >= 0 ? '#4a7c6a' : '#c0675a' }}>
                      {fmt(c.saldo)}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{c.cerrado_por_nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
