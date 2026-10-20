import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FarmaciaContext } from '../../context/FarmaciaContext';
import * as farmaciaAPI from '../../api/farmacia';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const errMsg = err => err.response?.data?.error || err.message;
const btn = (bg) => ({ padding: '0.75rem', background: bg, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' });

const FarmaciaDashboard = () => {
  const navigate = useNavigate();
  const esAdmin = localStorage.getItem('rol') === 'admin';
  const { cajaAbierta, setCajaAbierta, cargarCaja } = useContext(FarmaciaContext);
  const [efectivoInicial, setEfectivoInicial] = useState('');
  const [efectivoFinal, setEfectivoFinal] = useState('');
  const [cerrandoCaja, setCerrandoCaja] = useState(false);
  const [corte, setCorte] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // Ventas del turno abierto (la lista general para supervisión está en Finanzas › Farmacia)
  const cargarVentasCaja = (caja) => caja
    ? farmaciaAPI.getVentas({ caja_id: caja.id }).then(setVentas)
    : setVentas([]);

  useEffect(() => {
    cargarCaja().then(cargarVentasCaja).catch(err => setError(errMsg(err)));
  }, [cargarCaja]);

  const accion = async (fn) => {
    if (ocupado) return;
    setOcupado(true);
    setError('');
    try { await fn(); } catch (err) { setError(errMsg(err)); } finally { setOcupado(false); }
  };

  const abrirCaja = () => accion(async () => {
    if (efectivoInicial === '' || !(parseFloat(efectivoInicial) >= 0)) throw new Error('Captura el efectivo inicial (puede ser 0)');
    const caja = await farmaciaAPI.abrirCaja(parseFloat(efectivoInicial));
    setEfectivoInicial('');
    setCorte(null);
    cargarVentasCaja(await cargarCaja() || caja);
  });

  const cerrarCaja = () => accion(async () => {
    if (efectivoFinal === '' || !(parseFloat(efectivoFinal) >= 0)) throw new Error('Captura el efectivo contado');
    const cerrada = await farmaciaAPI.cerrarCaja(cajaAbierta.id, parseFloat(efectivoFinal));
    setCorte({ ...cajaAbierta, ...cerrada });
    setCajaAbierta(null);
    setVentas([]);
    setEfectivoFinal('');
    setCerrandoCaja(false);
  });

  const cancelar = (venta) => accion(async () => {
    if (!confirm(`¿Cancelar la venta #${venta.numero_venta} por ${fmt(venta.total)}? El stock regresa al inventario.`)) return;
    await farmaciaAPI.cancelarVenta(venta.id);
    cargarVentasCaja(await cargarCaja());
  });

  const esperado = cajaAbierta ? parseFloat(cajaAbierta.efectivo_inicial) + parseFloat(cajaAbierta.ventas_efectivo || 0) : 0;

  return (
    <div style={{ padding: '1rem', maxWidth: '800px' }}>
      <h1>Farmacia</h1>

      {error && <div style={{ color: '#d32f2f', padding: '0.75rem', background: '#ffebee', borderRadius: '4px', marginTop: '1rem' }}>{error}</div>}

      {corte && (
        <div style={{ background: parseFloat(corte.diferencia) === 0 ? '#e8f5e9' : '#fff3cd', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
          <h3>Corte de caja</h3>
          <p>Ventas: {corte.num_ventas} · Total {fmt(corte.total_ventas)} (efectivo {fmt(corte.ventas_efectivo)}, terminal {fmt(corte.ventas_terminal)}, transferencia {fmt(corte.ventas_transferencia)})</p>
          <p>Efectivo esperado: <strong>{fmt(corte.efectivo_esperado)}</strong> · Contado: <strong>{fmt(corte.efectivo_final)}</strong></p>
          <p>Diferencia: <strong style={{ color: parseFloat(corte.diferencia) < 0 ? '#d32f2f' : 'inherit' }}>{fmt(corte.diferencia)}</strong>
            {parseFloat(corte.diferencia) < 0 ? ' (faltante)' : parseFloat(corte.diferencia) > 0 ? ' (sobrante)' : ' ✅ cuadra'}</p>
        </div>
      )}

      {!cajaAbierta ? (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
          <h2>Abrir caja</h2>
          <label>Efectivo inicial (fondo de caja)
            <input type="number" min="0" step="0.01" value={efectivoInicial} onChange={(e) => setEfectivoInicial(e.target.value)}
                   placeholder="0.00" style={{ width: '100%', padding: '0.5rem', margin: '0.25rem 0 1rem' }} />
          </label>
          <button onClick={abrirCaja} disabled={ocupado} style={{ ...btn('#4CAF50'), width: '100%' }}>Abrir caja</button>
        </div>
      ) : (
        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
          <p>✅ Caja abierta desde {new Date(cajaAbierta.fecha_apertura).toLocaleString('es-MX')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', margin: '0.75rem 0' }}>
            {[
              ['Ventas', cajaAbierta.num_ventas],
              ['Total vendido', fmt(cajaAbierta.total_ventas)],
              ['Efectivo', fmt(cajaAbierta.ventas_efectivo)],
              ['Terminal', fmt(cajaAbierta.ventas_terminal)],
              ['Transferencia', fmt(cajaAbierta.ventas_transferencia)],
              ['Efectivo en caja', fmt(esperado)],
            ].map(([l, v]) => (
              <div key={l} style={{ background: 'white', padding: '0.5rem', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{l}</div>
                <div style={{ fontWeight: 'bold' }}>{v}</div>
              </div>
            ))}
          </div>

          {!cerrandoCaja ? (
            <button onClick={() => setCerrandoCaja(true)} style={btn('#f44336')}>Cerrar caja</button>
          ) : (
            <div style={{ background: 'white', padding: '1rem', borderRadius: '4px' }}>
              <label>Efectivo contado en caja
                <input type="number" min="0" step="0.01" value={efectivoFinal} onChange={(e) => setEfectivoFinal(e.target.value)}
                       autoFocus style={{ width: '100%', padding: '0.5rem', margin: '0.25rem 0 0.5rem' }} />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={cerrarCaja} disabled={ocupado} style={{ ...btn('#2196F3'), flex: 1 }}>Confirmar cierre</button>
                <button onClick={() => setCerrandoCaja(false)} style={{ ...btn('#999'), flex: 1 }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${esAdmin ? 3 : 2}, 1fr)`, gap: '1rem', marginTop: '1.5rem' }}>
        <button onClick={() => navigate('/farmacia/pos')} style={{ ...btn('#2196F3'), padding: '1rem', fontWeight: 'bold' }}>🛒 Punto de Venta</button>
        <button onClick={() => navigate('/farmacia/inventario')} style={{ ...btn('#FF9800'), padding: '1rem', fontWeight: 'bold' }}>📋 Inventario</button>
        {esAdmin && <button onClick={() => navigate('/farmacia/catalogos')} style={{ ...btn('#9C27B0'), padding: '1rem', fontWeight: 'bold' }}>📚 Catálogos</button>}
      </div>
      {esAdmin && <p style={{ marginTop: '0.75rem', color: '#666' }}>Supervisión (ventas, cortes, egresos): Finanzas › Farmacia.</p>}

      {cajaAbierta && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Ventas de este turno</h3>
          {ventas.length === 0 ? <p style={{ color: '#999' }}>Sin ventas todavía</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
              <thead><tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>#</th><th>Hora</th><th>Método</th><th>Total</th><th></th>
              </tr></thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid #eee', color: v.estado === 'cancelada' ? '#999' : 'inherit', textDecoration: v.estado === 'cancelada' ? 'line-through' : 'none' }}>
                    <td style={{ padding: '0.5rem' }}>{v.numero_venta}</td>
                    <td>{new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{v.metodo_pago}</td>
                    <td>{fmt(v.total)}</td>
                    <td>{v.estado === 'pagada'
                      ? <button onClick={() => cancelar(v)} disabled={ocupado} style={{ ...btn('#f44336'), padding: '0.25rem 0.5rem' }}>Cancelar</button>
                      : 'cancelada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmaciaDashboard;
