import { useState, useEffect } from 'react';
import * as farmaciaAPI from '../../api/farmacia';

const FarmaciaCatalogos = () => {
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [productosProveedor, setProductosProveedor] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      const res = await farmaciaAPI.getProveedores();
      setProveedores(res);
    } catch (err) {
      setError('Error al cargar proveedores');
    }
  };

  const seleccionarProveedor = async (proveedor) => {
    setSelectedProveedor(proveedor);
    setLoading(true);
    try {
      const res = await farmaciaAPI.getProductos(null, proveedor.id);
      setProductosProveedor(res || []);
    } catch (err) {
      setError('Error al cargar catálogo');
      setProductosProveedor([]);
    }
    setLoading(false);
  };

  const agregarProductoInventario = async (producto) => {
    try {
      const cantidad = prompt(`Cantidad de "${producto.nombre}" a agregar al inventario:`, '10');
      if (cantidad) {
        await farmaciaAPI.createProducto({
          ...producto,
          stock: parseInt(cantidad)
        });
        alert('Producto agregado al inventario');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Catálogos de Proveedores</h1>

      {error && <div style={{ color: '#d32f2f', padding: '1rem', background: '#ffebee', marginBottom: '1rem', borderRadius: '4px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {proveedores.length === 0 ? (
          <p style={{ color: '#999' }}>No hay proveedores registrados</p>
        ) : (
          proveedores.map(prov => (
            <button
              key={prov.id}
              onClick={() => seleccionarProveedor(prov)}
              style={{
                padding: '1.5rem',
                background: selectedProveedor?.id === prov.id ? '#2196F3' : '#f5f5f5',
                color: selectedProveedor?.id === prov.id ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{prov.nombre}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '0.5rem' }}>
                {prov.email && <div>{prov.email}</div>}
                {prov.telefono && <div>{prov.telefono}</div>}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedProveedor && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h2>Catálogo: {selectedProveedor.nombre}</h2>

          {loading && <p>Cargando productos...</p>}

          {!loading && productosProveedor.length === 0 && (
            <p style={{ color: '#999' }}>No hay productos registrados de este proveedor</p>
          )}

          {!loading && productosProveedor.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Producto</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Código</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Precio Venta</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {productosProveedor.map(prod => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '0.75rem' }}>{prod.nombre}</td>
                    <td style={{ padding: '0.75rem' }}>{prod.codigo_proveedor}</td>
                    <td style={{ padding: '0.75rem' }}>${prod.precio_venta}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => agregarProductoInventario(prod)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        + Agregar
                      </button>
                    </td>
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

export default FarmaciaCatalogos;
