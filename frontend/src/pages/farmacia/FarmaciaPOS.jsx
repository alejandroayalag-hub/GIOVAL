import { useContext, useState, useEffect } from 'react';
import { FarmaciaContext } from '../../context/FarmaciaContext';
import * as farmaciaAPI from '../../api/farmacia';

const FarmaciaPOS = () => {
  const { items, agregarItem, removerItem, actualizarCantidad, limpiar, total, cajaAbierta } = useContext(FarmaciaContext);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState('');
  const [modalPago, setModalPago] = useState(false);

  useEffect(() => {
    farmaciaAPI.getProductos().then(setProductos).catch(err => setError(err.message));
  }, []);

  const handleBuscar = async (valor) => {
    setBusqueda(valor);
    if (!valor.trim()) {
      setResultados([]);
      return;
    }
    const res = await farmaciaAPI.getProductos(valor);
    setResultados(res);
  };

  const handleSeleccionar = (producto) => {
    const cantidad = prompt(`Cantidad de "${producto.nombre}":`, '1');
    if (cantidad && parseInt(cantidad) > 0) {
      agregarItem(producto, parseInt(cantidad));
      setBusqueda('');
      setResultados([]);
    }
  };

  const handlePagar = async (metodo_pago) => {
    try {
      if (!cajaAbierta) {
        setError('Necesitas abrir caja primero');
        return;
      }

      const venta = await farmaciaAPI.createVenta({});

      for (const item of items) {
        await farmaciaAPI.agregarItemVenta(venta.id, {
          producto_id: item.producto_id,
          cantidad: item.cantidad
        });
      }

      await farmaciaAPI.pagarVenta(venta.id, { metodo_pago });
      alert('Venta realizada exitosamente');
      limpiar();
      setModalPago(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!cajaAbierta) {
    return <div style={{padding: '1rem', background: '#fff3cd'}}>⚠ Abre una caja para comenzar a vender</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1rem', padding: '1rem' }}>
      <div>
        <h1>Punto de Venta</h1>

        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => handleBuscar(e.target.value)}
            placeholder="Buscar producto..."
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
          />
          {resultados.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ddd', maxHeight: '300px', overflowY: 'auto', zIndex: 10 }}>
              {resultados.map(p => (
                <div key={p.id} onClick={() => handleSeleccionar(p)} style={{ padding: '0.5rem', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                  {p.nombre} - ${p.precio_venta}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ color: '#d32f2f', padding: '1rem', background: '#ffebee' }}>{error}</div>}
      </div>

      <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '4px' }}>
        <h3>Carrito ({items.length})</h3>

        {items.length === 0 ? (
          <p style={{ color: '#999' }}>Carrito vacío</p>
        ) : (
          <>
            {items.map((item, idx) => (
              <div key={idx} style={{ background: 'white', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div><strong>{item.nombre}</strong></div>
                  <input type="number" value={item.cantidad} min="1" onChange={(e) => actualizarCantidad(idx, parseInt(e.target.value))} style={{ width: '60px' }} />
                  <span style={{ marginLeft: '0.5rem' }}>${item.precio_unitario}</span>
                </div>
                <button onClick={() => removerItem(idx)} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '0.5rem', cursor: 'pointer' }}>✕</button>
              </div>
            ))}

            <div style={{ borderTop: '2px solid #ddd', paddingTop: '1rem', marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right' }}>
              Total: ${total.toFixed(2)}
            </div>

            <button onClick={() => setModalPago(true)} style={{ width: '100%', padding: '0.75rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}>
              💰 Pagar
            </button>

            <button onClick={limpiar} style={{ width: '100%', padding: '0.75rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '0.5rem' }}>
              🗑 Limpiar Carrito
            </button>
          </>
        )}
      </div>

      {modalPago && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px' }}>
            <h2>Método de Pago</h2>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', background: '#f0f0f0', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>
              ${total.toFixed(2)}
            </div>
            <button onClick={() => handlePagar('efectivo')} style={{ width: '100%', padding: '0.75rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '0.5rem', cursor: 'pointer' }}>💵 Efectivo</button>
            <button onClick={() => handlePagar('terminal')} style={{ width: '100%', padding: '0.75rem', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '0.5rem', cursor: 'pointer' }}>💳 Terminal</button>
            <button onClick={() => handlePagar('transferencia')} style={{ width: '100%', padding: '0.75rem', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '0.5rem', cursor: 'pointer' }}>🏦 Transferencia</button>
            <button onClick={() => setModalPago(false)} style={{ width: '100%', padding: '0.5rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmaciaPOS;
