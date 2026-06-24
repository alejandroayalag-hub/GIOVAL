import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, CreditCard, Banknote, Smartphone, Plus } from 'lucide-react';
import { getCajaHoy, createMovimiento, getCategorias } from '../../api/finanzas';
import MovimientoModal from './MovimientoModal';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
const fmtHora = iso => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

const FORMAS = [
  { key: 'efectivo',      label: 'Efectivo',       Icon: Banknote,    color: '#4a7c6a' },
  { key: 'tarjeta',       label: 'Tarjeta',         Icon: CreditCard,  color: '#5a6aa0' },
  { key: 'transferencia', label: 'Transferencia',   Icon: Smartphone,  color: '#7a6ab0' },
];

export default function CajaPanel() {
  const [datos, setDatos]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [ultimaAct, setUltimaAct] = useState(null);
  const [cobrandoId, setCobrandoId] = useState(null);
  const [movModal, setMovModal] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const intervalRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const data = await getCajaHoy();
      setDatos(data);
      setUltimaAct(new Date());
      setError('');
    } catch {
      setError('Error al cargar datos de caja');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    getCategorias().then(setCategorias).catch(() => {});
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') cargar();
    }, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [cargar]);

  async function cobrarRapido(cita, forma_pago) {
    if (!cita.precio) {
      setMovModal({ cita });
      return;
    }
    setCobrandoId(`${cita.cita_id}-${forma_pago}`);
    try {
      await createMovimiento({
        tipo: 'ingreso',
        concepto: cita.tratamiento_nombre || 'Tratamiento',
        monto: parseFloat(cita.precio),
        forma_pago,
        cita_id: cita.cita_id,
      });
      await cargar();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al registrar cobro');
    } finally {
      setCobrandoId(null);
    }
  }

  async function handleSaveModal(data) {
    const cita_id = movModal?.cita?.cita_id;
    await createMovimiento({ ...data, tipo: 'ingreso', cita_id });
    await cargar();
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Cargando caja…</div>;
  if (error)   return <div className="py-12 text-center text-red-400 text-sm">{error}</div>;

  const { resumen, pendientes, movimientos } = datos;

  return (
    <div className="space-y-5">
      {/* Barra superior */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Actualizado: {ultimaAct ? ultimaAct.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
        </span>
        <button onClick={cargar}
                className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded-lg"
                style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
          <RefreshCw className="w-3 h-3" />
          Actualizar
        </button>
      </div>

      {/* Resumen por forma de pago */}
      <div className="grid grid-cols-4 gap-3">
        {FORMAS.map(({ key, label, Icon, color }) => (
          <div key={key} className="bg-white rounded-xl border p-4 text-center"
               style={{ borderColor: 'var(--color-sage)' }}>
            <div className="flex justify-center mb-1">
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color }}>
              {fmt(resumen[key])}
            </p>
          </div>
        ))}
        <div className="bg-white rounded-xl border p-4 text-center"
             style={{ borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-cream)' }}>
          <p className="text-xs text-gray-400 mb-0.5 mt-5">Total cobrado</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-dark)' }}>
            {fmt(resumen.total)}
          </p>
        </div>
      </div>

      {/* Pendientes de cobrar */}
      <div className="bg-white rounded-xl border overflow-hidden"
           style={{ borderColor: 'var(--color-sage)' }}>
        <div className="flex items-center justify-between px-5 py-3"
             style={{ backgroundColor: 'var(--color-primary)' }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-dark)' }}>
            Pendientes de cobrar
          </span>
          {pendientes.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
              {pendientes.length}
            </span>
          )}
        </div>

        {pendientes.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center text-gray-400">Sin citas pendientes de cobro</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-sage)' }}>
            {pendientes.map(cita => (
              <div key={cita.cita_id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-dark)' }}>
                      {cita.paciente_nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {cita.tratamiento_nombre || '—'} · {fmtHora(cita.fecha_hora)}
                      {cita.precio
                        ? <span className="ml-2 font-semibold" style={{ color: 'var(--color-accent)' }}>
                            {fmt(cita.precio)}
                          </span>
                        : <span className="ml-2 text-gray-400">sin precio</span>
                      }
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {FORMAS.map(({ key, label, color }) => (
                    <button key={key}
                            disabled={!!cobrandoId}
                            onClick={() => cobrarRapido(cita, key)}
                            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-50 transition-opacity"
                            style={{ backgroundColor: color }}>
                      {cobrandoId === `${cita.cita_id}-${key}` ? '...' : label}
                    </button>
                  ))}
                  <button onClick={() => setMovModal({ cita })}
                          className="text-xs px-3 py-1.5 rounded-lg border"
                          style={{ borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
                    ✎ Editar monto
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Movimientos del día */}
      <div className="bg-white rounded-xl border overflow-hidden"
           style={{ borderColor: 'var(--color-sage)' }}>
        <div className="flex items-center justify-between px-5 py-3"
             style={{ backgroundColor: 'var(--color-primary)' }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-dark)' }}>
            Cobros y movimientos de hoy
          </span>
          <button onClick={() => setMovModal({ cita: null })}
                  className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
            <Plus className="w-3 h-3" />
            Movimiento
          </button>
        </div>

        {movimientos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center text-gray-400">Sin movimientos hoy</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-sage)' }}>
            {movimientos.map(m => (
              <div key={m.id} className="px-5 py-2.5 flex items-center gap-3">
                <span className="text-base leading-none"
                      style={{ color: m.tipo === 'ingreso' ? '#4a7c6a' : '#c0675a' }}>
                  {m.tipo === 'ingreso' ? '✓' : '↓'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--color-dark)' }}>
                    {m.paciente_nombre
                      ? <><span className="font-medium">{m.paciente_nombre.split(' ')[0]}</span> · {m.concepto}</>
                      : m.concepto
                    }
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold tabular-nums"
                     style={{ color: m.tipo === 'ingreso' ? '#4a7c6a' : '#c0675a' }}>
                    {fmt(m.monto)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.forma_pago} · {fmtHora(m.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {movModal !== null && (
        <MovimientoModal
          tipo="ingreso"
          prefill={movModal.cita ? {
            concepto: movModal.cita.tratamiento_nombre || '',
            monto: movModal.cita.precio || '',
            forma_pago: 'efectivo',
            fecha: new Date().toISOString().split('T')[0],
          } : undefined}
          categorias={categorias}
          onSave={handleSaveModal}
          onClose={() => setMovModal(null)}
        />
      )}
    </div>
  );
}
