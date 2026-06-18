import { useState, useEffect } from 'react';
import * as farmaciaAPI from '../../api/farmacia';

const FarmaciaInventario = () => {
  const [productos, setProductos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', codigo_proveedor: '', precio_costo: '', precio_venta: '', stock: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const res = await farmaciaAPI.getProductos();
      setProductos(res);
    } catch (err) {
      setError(err.message);
    }
  };

  const crear = async () => {
    try {
      await farmaciaAPI.createProducto(formData);
      setFormData({ nombre: '', codigo_proveedor: '', precio_costo: '', precio_venta: '', stock: '' });
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async (id) => {
    if (confirm('¿Estás seguro?')) {
      try {
        await farmaciaAPI.deleteProducto(id);
        await cargar();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Inventario</h1>

      <button onClick={() => setMostrarForm(!mostrarForm)} style={{ padding: '0.5rem 1rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '1rem', cursor: 'pointer' }}>
        + Agregar Producto
      </button>

      {mostrarForm && (
        <div style={{ background: '#f9f9f9', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Nombre" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
          <input type="text" value={formData.codigo_proveedor} onChange={(e) => setFormData({ ...formData, codigo_proveedor: e.target.value })} placeholder="Código" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
          <input type="number" value={formData.precio_costo} onChange={(e) => setFormData({ ...formData, precio_costo: e.target.value })} placeholder="Precio Costo" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
          <input type="number" value={formData.precio_venta} onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })} placeholder="Precio Venta" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
          <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} placeholder="Stock" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
          <button onClick={crear} style={{ padding: '0.5rem 1rem', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginRight: '0.5rem', cursor: 'pointer' }}>Crear</button>
          <button onClick={() => setMostrarForm(false)} style={{ padding: '0.5rem 1rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}

      {error && <div style={{ color: '#d32f2f', padding: '1rem', background: '#ffebee', marginBottom: '1rem' }}>{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Nombre</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Código</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Precio Venta</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Stock</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '0.75rem' }}>{p.nombre}</td>
              <td style={{ padding: '0.75rem' }}>{p.codigo_proveedor}</td>
              <td style={{ padding: '0.75rem' }}>${p.precio_venta}</td>
              <td style={{ padding: '0.75rem', color: p.stock <= p.stock_minimo ? 'red' : 'black', fontWeight: p.stock <= p.stock_minimo ? 'bold' : 'normal' }}>{p.stock}</td>
              <td style={{ padding: '0.75rem' }}>
                <button onClick={() => eliminar(p.id)} style={{ padding: '0.25rem 0.75rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FarmaciaInventario;
