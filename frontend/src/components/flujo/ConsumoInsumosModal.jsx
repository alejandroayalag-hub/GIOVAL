import { useState, useEffect, useRef } from 'react';
import { getCitaInsumos, confirmarCitaInsumos, getInsumoByBarcode, getInsumos } from '../../api/insumos';

const num = v => parseFloat(v || 0);

export default function ConsumoInsumosModal({ citaId, tratamientoNombre, onClose, onConfirmado }) {
  const [cargando, setCargando] = useState(true);
  const [confirmado, setConfirmado] = useState(false);
  const [items, setItems] = useState([]); // {insumo_id, nombre, codigo, codigo_barras, cantidad, unidad, costo_unidad, stock_actual, usado, extra}
  const [scan, setScan] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const [catalogo, setCatalogo] = useState(null); // lazy, solo si agregan manual
  const [agregarSel, setAgregarSel] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const scanRef = useRef(null);

  useEffect(() => {
    getCitaInsumos(citaId)
      .then(data => {
        setConfirmado(data.confirmado);
        // Kit completo inicia marcado (caso común); se desmarca lo que no se usó.
        setItems(data.items.map(it => ({ ...it, cantidad: num(it.cantidad), usado: true })));
      })
      .catch(e => setError(e.response?.data?.error || 'Error al cargar insumos'))
      .finally(() => setCargando(false));
  }, [citaId]);

  useEffect(() => {
    if (!cargando && !confirmado) scanRef.current?.focus();
  }, [cargando, confirmado]);

  function setItem(insumo_id, patch) {
    setItems(prev => prev.map(it => it.insumo_id === insumo_id ? { ...it, ...patch } : it));
  }

  async function handleScan(e) {
    e.preventDefault();
    const codigo = scan.trim();
    setScan(''); setScanMsg('');
    if (!codigo) return;

    const enLista = items.find(it => it.codigo_barras === codigo);
    if (enLista) {
      setItem(enLista.insumo_id, { usado: true });
      setScanMsg(`✓ ${enLista.nombre}`);
      return;
    }
    try {
      const ins = await getInsumoByBarcode(codigo);
      const yaAgregado = items.find(it => it.insumo_id === ins.id);
      if (yaAgregado) {
        setItem(ins.id, { usado: true });
        setScanMsg(`✓ ${ins.nombre}`);
      } else {
        setItems(prev => [...prev, {
          insumo_id: ins.id, nombre: ins.nombre, codigo: ins.codigo,
          codigo_barras: ins.codigo_barras, cantidad: 1, unidad: null,
          costo_unidad: num(ins.costo_unidad), stock_actual: ins.stock_actual,
          usado: true, extra: true,
        }]);
        setScanMsg(`+ ${ins.nombre} (extra)`);
      }
    } catch {
      setScanMsg(`✕ Código "${codigo}" no registrado`);
    }
  }

  async function abrirCatalogo() {
    if (catalogo) { setCatalogo(null); return; }
    try { setCatalogo(await getInsumos()); }
    catch { setError('Error al cargar catálogo de insumos'); }
  }

  function agregarManual() {
    const ins = catalogo?.find(i => i.id === parseInt(agregarSel));
    if (!ins) return;
    if (items.find(it => it.insumo_id === ins.id)) {
      setItem(ins.id, { usado: true });
    } else {
      setItems(prev => [...prev, {
        insumo_id: ins.id, nombre: ins.nombre, codigo: ins.codigo,
        codigo_barras: ins.codigo_barras, cantidad: 1, unidad: null,
        costo_unidad: num(ins.costo_unidad), stock_actual: ins.stock_actual,
        usado: true, extra: true,
      }]);
    }
    setAgregarSel(''); setCatalogo(null);
  }

  async function handleConfirmar() {
    const usados = items.filter(it => it.usado && num(it.cantidad) > 0);
    if (usados.length === 0) return;
    setGuardando(true); setError('');
    try {
      await confirmarCitaInsumos(citaId, usados.map(it => ({ insumo_id: it.insumo_id, cantidad: num(it.cantidad) })));
      onConfirmado();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al confirmar consumo');
      setGuardando(false);
    }
  }

  const totalCosto = items.filter(it => it.usado).reduce((s, it) => s + num(it.cantidad) * num(it.costo_unidad), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-sage)' }}>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-dark)' }}>
              {confirmado ? 'Insumos consumidos' : 'Confirmar consumo de insumos'}
            </h3>
            {tratamientoNombre && <p className="text-xs text-gray-400">{tratamientoNombre}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {cargando && <p className="text-sm text-gray-400 text-center py-6">Cargando…</p>}

          {!cargando && !confirmado && (
            <form onSubmit={handleScan} className="flex gap-2 items-center">
              <input
                ref={scanRef}
                value={scan}
                onChange={e => setScan(e.target.value)}
                placeholder="Escanear código de barras…"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-sage)' }}
              />
              {scanMsg && <span className="text-xs text-gray-500 flex-shrink-0">{scanMsg}</span>}
            </form>
          )}

          {!cargando && items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              {confirmado ? 'Sin insumos registrados' : 'Este tratamiento no tiene kit asignado — escanea o agrega insumos usados'}
            </p>
          )}

          {items.map(it => {
            const stockRestante = num(it.stock_actual) - (it.usado && !confirmado ? num(it.cantidad) : 0);
            const insuficiente = !confirmado && it.usado && stockRestante < 0;
            return (
              <div key={it.insumo_id}
                   className="flex items-center gap-3 border rounded-lg px-3 py-2"
                   style={{ borderColor: insuficiente ? '#e05252' : 'var(--color-sage)', opacity: !confirmado && !it.usado ? 0.6 : 1 }}>
                {!confirmado && (
                  <input type="checkbox" checked={it.usado}
                         onChange={e => setItem(it.insumo_id, { usado: e.target.checked })}
                         className="w-4 h-4 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--color-dark)' }}>
                    {it.nombre} {it.extra && <span className="text-xs" style={{ color: 'var(--color-accent)' }}>(extra)</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {it.codigo}
                    {insuficiente && <span className="text-red-500 ml-2">⚠ stock insuficiente (quedará en {stockRestante.toFixed(2)})</span>}
                  </p>
                </div>
                {confirmado ? (
                  <span className="text-sm tabular-nums text-gray-500 flex-shrink-0">{num(it.cantidad)} {it.unidad || ''}</span>
                ) : (
                  <input type="number" min="0.01" step="any" value={it.cantidad}
                         onChange={e => setItem(it.insumo_id, { cantidad: e.target.value })}
                         disabled={!it.usado}
                         className="w-20 border rounded-lg px-2 py-1 text-sm text-right disabled:bg-gray-50"
                         style={{ borderColor: 'var(--color-sage)' }} />
                )}
                {it.unidad && !confirmado && <span className="text-xs text-gray-400 flex-shrink-0 w-8">{it.unidad}</span>}
              </div>
            );
          })}

          {!cargando && !confirmado && (
            <div>
              <button onClick={abrirCatalogo} className="text-xs" style={{ color: 'var(--color-accent)' }}>
                + Agregar insumo manual
              </button>
              {catalogo && (
                <div className="flex gap-2 mt-2">
                  <select value={agregarSel} onChange={e => setAgregarSel(e.target.value)}
                          className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                          style={{ borderColor: 'var(--color-sage)' }}>
                    <option value="">— Insumo —</option>
                    {catalogo.filter(i => i.activo).map(i => (
                      <option key={i.id} value={i.id}>{i.nombre} ({i.codigo})</option>
                    ))}
                  </select>
                  <button onClick={agregarManual} disabled={!agregarSel}
                          className="px-3 py-1.5 text-sm rounded-lg text-white disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-accent)' }}>
                    Agregar
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-sage)' }}>
          <span className="text-xs text-gray-500">
            Costo insumos: <span className="font-semibold tabular-nums">${totalCosto.toFixed(2)}</span>
          </span>
          {confirmado ? (
            <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg border"
                    style={{ borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
              Cerrar
            </button>
          ) : (
            <button onClick={handleConfirmar}
                    disabled={guardando || items.filter(it => it.usado && num(it.cantidad) > 0).length === 0}
                    className="px-4 py-1.5 text-sm rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#4a7c6a' }}>
              {guardando ? 'Guardando…' : '✓ Confirmar y descontar stock'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
