import { useContext, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FarmaciaContext } from '../../context/FarmaciaContext';
import * as farmaciaAPI from '../../api/farmacia';
import { EmpresaToggle } from '../../components/finanzas/empresa';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const errMsg = err => err.response?.data?.error || err.message;

const METODOS = [
  { id: 'efectivo', label: '💵 Efectivo', color: '#4CAF50' },
  { id: 'terminal', label: '💳 Terminal', color: '#2196F3' },
  { id: 'transferencia', label: '🏦 Transferencia', color: '#FF9800' },
];

// Cliente opcional de la venta: por defecto "Público general"
function ClienteSelector({ cliente, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [nuevo, setNuevo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(() => farmaciaAPI.buscarClientes(q.trim()).then(setRes).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [q]);

  const elegir = (c) => { onChange(c); setAbierto(false); setQ(''); setRes([]); setNuevo(null); };

  const guardarNuevo = async () => {
    try { elegir(await farmaciaAPI.crearCliente(nuevo)); } catch (err) { setError(errMsg(err)); }
  };

  if (!abierto) {
    return (
      <div style={{ marginBottom: '0.75rem' }}>
        Cliente: <strong>{cliente ? `${cliente.nombre}${cliente.tipo === 'paciente' ? ' (paciente)' : ''}` : 'Público general'}</strong>{' '}
        <button onClick={() => setAbierto(true)} style={{ fontSize: '0.85rem' }}>cambiar</button>
        {cliente && <button onClick={() => onChange(null)} style={{ fontSize: '0.85rem', marginLeft: '0.25rem' }}>quitar</button>}
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
      {!nuevo ? (
        <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o teléfono del cliente"
                 style={{ width: '100%', padding: '0.5rem' }} />
          {res.map(c => (
            <div key={`${c.tipo}-${c.id}`} onClick={() => elegir(c)} style={{ padding: '0.4rem', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
              {c.nombre} {c.telefono && `· ${c.telefono}`} <span style={{ color: '#999', fontSize: '0.8rem' }}>{c.tipo === 'paciente' ? 'paciente' : 'externo'}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button onClick={() => setNuevo({ nombre: q, telefono: '' })}>+ Cliente nuevo</button>
            <button onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <input autoFocus value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre"
                 style={{ width: '100%', padding: '0.5rem', marginBottom: '0.25rem' }} />
          <input value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} placeholder="Teléfono (opcional)"
                 style={{ width: '100%', padding: '0.5rem' }} />
          {error && <div style={{ color: '#d32f2f', fontSize: '0.85rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button onClick={guardarNuevo}>Guardar</button>
            <button onClick={() => setNuevo(null)}>Atrás</button>
          </div>
        </>
      )}
    </div>
  );
}

const FarmaciaPOS = () => {
  const { items, agregarItem, removerItem, actualizarCantidad, limpiar, total, cajaAbierta, cargarCaja } = useContext(FarmaciaContext);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState('');
  const [modalPago, setModalPago] = useState(false);
  const [recibido, setRecibido] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState(null);
  const [cliente, setCliente] = useState(null);
  // Razón social de la venta (Giovanna PF / Elys PM); se recuerda la última elegida en esta computadora
  const [empresa, setEmpresa] = useState(() => { try { return localStorage.getItem('farmaciaEmpresa') || ''; } catch { return ''; } });
  const elegirEmpresa = (e) => { setEmpresa(e); try { localStorage.setItem('farmaciaEmpresa', e); } catch { /* sin storage */ } };
  const inputRef = useRef(null);

  useEffect(() => {
    cargarCaja().catch(err => setError(errMsg(err))).finally(() => setCargando(false));
  }, [cargarCaja]);

  // Búsqueda con espera de 300 ms (el lector de código teclea muy rápido)
  useEffect(() => {
    const q = busqueda.trim();
    if (!q) { setResultados([]); return; }
    const t = setTimeout(() => farmaciaAPI.getProductos(q).then(setResultados).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const seleccionar = (producto) => {
    setError('');
    if (!(parseFloat(producto.precio_venta) > 0)) {
      setError(`"${producto.nombre}" no tiene precio de venta. Pídele a la doctora que lo capture.`);
      return;
    }
    if (producto.stock <= 0) {
      setError(`"${producto.nombre}" sin existencias`);
      return;
    }
    agregarItem(producto, 1);
    setBusqueda('');
    setResultados([]);
    inputRef.current?.focus();
  };

  // Enter: código de barras exacto o único resultado
  const handleEnter = async () => {
    const q = busqueda.trim();
    if (!q) return;
    try {
      const res = await farmaciaAPI.getProductos(q);
      const exacto = res.find(p => p.codigo_barras === q) || (res.length === 1 ? res[0] : null);
      if (exacto) seleccionar(exacto);
      else if (res.length === 0) setError(`"${q}" no está registrado en inventario`);
      else setResultados(res);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const cobrar = async (metodo_pago) => {
    if (cobrando) return;
    if (!empresa) { setError('Elige la empresa de la venta: Giovanna PF o Elys PM'); return; }
    setCobrando(true);
    setError('');
    try {
      const venta = await farmaciaAPI.checkout(
        items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })), metodo_pago, cliente, empresa);
      const cambio = metodo_pago === 'efectivo' && parseFloat(recibido) > 0 ? parseFloat(recibido) - total : null;
      setUltimaVenta({ ...venta, cambio });
      limpiar();
      setCliente(null);
      setModalPago(false);
      setRecibido('');
      cargarCaja();
      inputRef.current?.focus();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setCobrando(false);
    }
  };

  if (cargando) return <div style={{ padding: '1rem' }}>Cargando…</div>;

  if (!cajaAbierta) {
    return (
      <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '8px' }}>
        ⚠ Abre tu caja para comenzar a vender. <Link to="/farmacia">Ir a abrir caja</Link>
      </div>
    );
  }

  const cambio = parseFloat(recibido) - total;
  const excedeStock = items.filter(i => i.stock !== undefined && i.cantidad > i.stock);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '1rem', padding: '1rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1>Punto de Venta</h1>
          <Link to="/farmacia">← Mi caja</Link>
        </div>

        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
            placeholder="Buscar producto o escanear código..."
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
          />
          {resultados.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ddd', maxHeight: '300px', overflowY: 'auto', zIndex: 10 }}>
              {resultados.map(p => (
                <div key={p.id} onClick={() => seleccionar(p)}
                     style={{ padding: '0.5rem', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: p.stock > 0 ? 'inherit' : '#999' }}>
                  <span>{p.nombre}</span>
                  <span>{parseFloat(p.precio_venta) > 0 ? fmt(p.precio_venta) : 'sin precio'} · {p.stock} pza</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && !modalPago && <div style={{ color: '#d32f2f', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>{error}</div>}

        {ultimaVenta && (
          <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '4px', marginTop: '1rem' }}>
            ✅ Venta #{ultimaVenta.numero_venta} cobrada: {fmt(ultimaVenta.total)} ({ultimaVenta.metodo_pago})
            {ultimaVenta.cambio > 0 && <strong> — Cambio: {fmt(ultimaVenta.cambio)}</strong>}
          </div>
        )}
      </div>

      <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '4px' }}>
        <h3>Carrito ({items.length})</h3>
        <ClienteSelector cliente={cliente} onChange={setCliente} />

        {items.length === 0 ? (
          <p style={{ color: '#999' }}>Carrito vacío</p>
        ) : (
          <>
            {items.map((item, idx) => (
              <div key={item.producto_id} style={{ background: 'white', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <div><strong>{item.nombre}</strong></div>
                  <input type="number" value={item.cantidad} min="1" step="1"
                         onChange={(e) => actualizarCantidad(idx, e.target.value)} style={{ width: '60px' }} />
                  <span style={{ marginLeft: '0.5rem' }}>× {fmt(item.precio_unitario)} = {fmt(item.cantidad * item.precio_unitario)}</span>
                  {item.cantidad > item.stock && <div style={{ color: '#d32f2f', fontSize: '0.8rem' }}>Solo hay {item.stock}</div>}
                </div>
                <button onClick={() => removerItem(idx)} aria-label={`Quitar ${item.nombre}`}
                        style={{ background: '#ff4444', color: 'white', border: 'none', padding: '0.5rem', cursor: 'pointer', alignSelf: 'start' }}>✕</button>
              </div>
            ))}

            <div style={{ borderTop: '2px solid #ddd', paddingTop: '1rem', marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right' }}>
              Total: {fmt(total)}
            </div>

            <button onClick={() => { setError(''); setModalPago(true); }} disabled={excedeStock.length > 0}
                    style={{ width: '100%', padding: '0.75rem', background: excedeStock.length ? '#aaa' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}>
              💰 Cobrar
            </button>

            <button onClick={() => confirm('¿Vaciar el carrito?') && limpiar()}
                    style={{ width: '100%', padding: '0.75rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '0.5rem' }}>
              🗑 Vaciar carrito
            </button>
          </>
        )}
      </div>

      {modalPago && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h2>Cobrar</h2>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', background: '#f0f0f0', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>
              {fmt(total)}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              Empresa *
              <div style={{ marginTop: '0.25rem' }}><EmpresaToggle value={empresa} onChange={elegirEmpresa} /></div>
            </div>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              Efectivo recibido (opcional, para calcular cambio)
              <input type="number" min="0" step="0.01" value={recibido} onChange={(e) => setRecibido(e.target.value)}
                     style={{ width: '100%', padding: '0.5rem' }} />
              {recibido !== '' && (
                <div style={{ marginTop: '0.25rem', color: cambio >= 0 ? '#2e7d32' : '#d32f2f' }}>
                  {cambio >= 0 ? `Cambio: ${fmt(cambio)}` : `Faltan ${fmt(-cambio)}`}
                </div>
              )}
            </label>
            {error && <div style={{ color: '#d32f2f', padding: '0.75rem', background: '#ffebee', borderRadius: '4px', marginBottom: '0.75rem' }}>{error}</div>}
            {METODOS.map(m => (
              <button key={m.id} onClick={() => cobrar(m.id)}
                      disabled={cobrando || (m.id === 'efectivo' && recibido !== '' && cambio < 0)}
                      style={{ width: '100%', padding: '0.75rem', background: m.color, color: 'white', border: 'none', borderRadius: '4px', marginBottom: '0.5rem', cursor: 'pointer', opacity: cobrando ? 0.6 : 1 }}>
                {cobrando ? 'Cobrando…' : m.label}
              </button>
            ))}
            <button onClick={() => { setModalPago(false); setError(''); }} disabled={cobrando}
                    style={{ width: '100%', padding: '0.5rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmaciaPOS;
