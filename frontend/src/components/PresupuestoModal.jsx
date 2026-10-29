import { useState, useEffect, useRef } from 'react';
import { getTratamientosActivos } from '../api/tratamientos';
import { getPromosVigentes } from '../api/promociones';
import { crearPresupuesto } from '../api/presupuestos';
import { calcularItem, totalPresupuesto, promosAplicables, pesos } from '../utils/presupuesto';
import SignaturePad from './SignaturePad';

const bStyle = { borderColor: 'var(--color-primary)' };

// planes: sugeridos del paciente. onFirmado(presupuesto) recibe lo que calculó el servidor.
export default function PresupuestoModal({ paciente, planes, onClose, onFirmado }) {
  const [precios, setPrecios] = useState({});
  const [promos, setPromos] = useState([]);
  const [filas, setFilas] = useState(() => planes.map(p => ({ plan: p, incluir: true, modalidad: 'por_sesion', promocion_id: '' })));
  const [paso, setPaso] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const sigRef = useRef(null);

  useEffect(() => {
    getTratamientosActivos().then(ts => setPrecios(Object.fromEntries(ts.map(t => [t.id, t.precio])))).catch(() => {});
    getPromosVigentes([...new Set(planes.map(p => p.tratamiento_id))]).then(setPromos).catch(() => setPromos([]));
  }, []);

  // Si al cambiar modalidad la promo elegida deja de aplicar, se quita; si hay exactamente una aplicable, se propone
  useEffect(() => {
    setFilas(fs => fs.map(f => {
      const ids = promosAplicables(promos, f.plan.tratamiento_id, f.modalidad).map(p => p.id);
      if (f.promocion_id && ids.includes(Number(f.promocion_id))) return f;
      return { ...f, promocion_id: ids.length === 1 ? ids[0] : '' };
    }));
  }, [promos, filas.map(f => f.modalidad).join()]);

  const setFila = (i, k, v) => setFilas(fs => fs.map((f, j) => (j === i ? { ...f, [k]: v } : f)));

  const calculadas = filas.map(f => {
    const precio = precios[f.plan.tratamiento_id];
    const promo = promos.find(p => p.id === Number(f.promocion_id));
    const descuento_pct = promo?.descuento_pct || 0;
    const subtotal = precio == null ? null
      : calcularItem({ precio_unitario: precio, sesiones: f.plan.sesiones_estimadas, descuento_pct }).subtotal;
    return { ...f, precio, promo, descuento_pct, subtotal };
  });
  const elegidas = calculadas.filter(f => f.incluir);
  const sinPrecio = elegidas.filter(f => f.precio == null);
  const total = totalPresupuesto(elegidas.filter(f => f.subtotal != null));
  const nombre = [paciente?.nombre, paciente?.apellido_paterno, paciente?.apellido_materno].filter(Boolean).join(' ');

  async function firmar() {
    if (sigRef.current?.isEmpty()) { setError('Falta la firma de la paciente'); return; }
    setLoading(true); setError('');
    try {
      const pres = await crearPresupuesto({
        paciente_id: paciente.id,
        firma: sigRef.current.toDataURL(),
        items: elegidas.map(f => ({ plan_id: f.plan.id, modalidad: f.modalidad, promocion_id: f.promocion_id || null })),
      });
      onFirmado(pres);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar el presupuesto');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-sage)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--color-dark)' }}>
            Presupuesto · {nombre}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {paso === 1 ? (
            <div className="space-y-3">
              {calculadas.map((f, i) => {
                const aplicables = promosAplicables(promos, f.plan.tratamiento_id, f.modalidad);
                return (
                  <div key={f.plan.id} className={`border rounded-lg p-3 ${f.incluir ? '' : 'opacity-50'}`} style={{ borderColor: 'var(--color-sage)' }}>
                    <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                      <input type="checkbox" checked={f.incluir} onChange={e => setFila(i, 'incluir', e.target.checked)}
                             className="accent-[var(--color-accent)]" />
                      {f.plan.tratamiento_nombre}
                      <span className="font-normal text-xs text-gray-500">
                        · {f.plan.sesiones_estimadas} {f.plan.sesiones_estimadas === 1 ? 'sesión' : 'sesiones'}{f.plan.frecuencia && ` · ${f.plan.frecuencia}`}
                      </span>
                    </label>
                    {f.incluir && (
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2 mt-2 items-center">
                        <select value={f.modalidad} onChange={e => setFila(i, 'modalidad', e.target.value)}
                                className="border rounded-lg px-2 py-1.5 text-sm" style={bStyle}>
                          <option value="por_sesion">Pago por sesión</option>
                          <option value="completo">Tratamiento completo</option>
                        </select>
                        <select value={f.promocion_id} onChange={e => setFila(i, 'promocion_id', Number(e.target.value) || '')}
                                className="border rounded-lg px-2 py-1.5 text-sm" style={bStyle} disabled={!aplicables.length}>
                          <option value="">{aplicables.length ? 'Sin promoción' : 'Sin promociones vigentes'}</option>
                          {aplicables.map(p => <option key={p.id} value={p.id}>{p.nombre} · {p.descuento_pct}%</option>)}
                        </select>
                        <p className="text-sm text-right whitespace-nowrap">
                          {f.precio == null ? <span className="text-red-500 text-xs">Sin precio en catálogo</span> : (
                            <>
                              <span className="text-xs text-gray-500">{pesos(f.precio)} × {f.plan.sesiones_estimadas}{f.descuento_pct ? ` −${f.descuento_pct}%` : ''} = </span>
                              <span className="font-semibold">{pesos(f.subtotal)}</span>
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="text-right text-lg font-bold" style={{ color: 'var(--color-dark)' }}>Total: {pesos(total)}</p>
              {sinPrecio.length > 0 && (
                <p className="text-xs text-red-500">Gio debe poner precio en Tratamientos a: {sinPrecio.map(f => f.plan.tratamiento_nombre).join(', ')}</p>
              )}
            </div>
          ) : (
            <div>
              <table className="w-full text-sm mb-3">
                <tbody>
                  {elegidas.map(f => (
                    <tr key={f.plan.id} className="border-b" style={{ borderColor: 'var(--color-sage)' }}>
                      <td className="py-1">{f.plan.tratamiento_nombre} · {f.plan.sesiones_estimadas} ses. · {f.modalidad === 'completo' ? 'tratamiento completo' : 'por sesión'}{f.promo && ` · ${f.promo.nombre} −${f.descuento_pct}%`}</td>
                      <td className="py-1 text-right">{pesos(f.subtotal)}</td>
                    </tr>
                  ))}
                  <tr><td className="py-1 font-bold">Total</td><td className="py-1 text-right font-bold">{pesos(total)}</td></tr>
                </tbody>
              </table>
              <p className="text-sm mb-3" style={{ color: 'var(--color-dark)' }}>
                Yo, <strong>{nombre}</strong>, acepto el costo de los tratamientos descritos en este presupuesto.
              </p>
              <div className="border rounded-lg inline-block" style={{ borderColor: 'var(--color-sage)' }}>
                <SignaturePad ref={sigRef} width={500} height={160} />
              </div>
              <button type="button" onClick={() => sigRef.current?.clear()} className="block text-xs mt-1 text-gray-500">Borrar firma</button>
            </div>
          )}
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--color-sage)' }}>
          {paso === 1 ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--color-sage)' }}>Cancelar</button>
              <button onClick={() => { setError(''); setPaso(2); }} disabled={!elegidas.length || sinPrecio.length > 0}
                      className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)' }}>
                Continuar a firma
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setPaso(1)} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--color-sage)' }}>← Regresar</button>
              <button onClick={firmar} disabled={loading}
                      className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando…' : 'Firmar y aceptar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
