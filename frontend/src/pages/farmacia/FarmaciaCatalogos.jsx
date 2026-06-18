import { useState, useEffect } from 'react';
import * as farmaciaAPI from '../../api/farmacia';

const FarmaciaCatalogos = () => {
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [productosProveedor, setProductosProveedor] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarUpload, setMostrarUpload] = useState(false);
  const [productosParseados, setProductosParseados] = useState([]);
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState('');

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      const res = await farmaciaAPI.getProveedores();
      setProveedores(res || []);
    } catch (err) {
      setError('Error al cargar proveedores');
    }
  };

  const crearProveedor = async () => {
    if (!nuevoProveedor.trim()) {
      setError('Escribe el nombre del proveedor');
      return;
    }
    try {
      await farmaciaAPI.createProveedor({ nombre: nuevoProveedor });
      setNuevoProveedor('');
      setMostrarNuevoProveedor(false);
      setError('');
      await cargarProveedores();
      alert('Proveedor creado exitosamente');
    } catch (err) {
      setError('Error: ' + err.message);
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

  const procesarArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lineas = text.split('\n').filter(l => l.trim());
        const productos = lineas.map(linea => {
          const [codigo, nombre, precio_costo, precio_venta] = linea.split(',');
          return {
            codigo_proveedor: codigo?.trim() || '',
            nombre: nombre?.trim() || '',
            precio_costo: parseFloat(precio_costo) || 0,
            precio_venta: parseFloat(precio_venta) || 0,
            proveedor_id: selectedProveedor?.id
          };
        }).filter(p => p.nombre);

        setProductosParseados(productos);
        setError('');
      } else if (file.name.endsWith('.pdf')) {
        setError('⏳ Procesando PDF...');

        // Convertir PDF a texto usando una técnica simple
        const arrayBuffer = await file.arrayBuffer();
        // Extraer texto de forma simple del PDF (sin worker)
        const text = new TextDecoder().decode(arrayBuffer);

        // Buscar patrones de líneas con números
        const lineas = text.split(/[\r\n]+/).filter(l => l.trim());
        const productos = [];
        let contador = 0;

        for (const linea of lineas) {
          if (linea.length < 5) continue;

          const numeros = linea.match(/\d+\.?\d*/g) || [];
          if (numeros.length >= 2) {
            const precioVenta = parseFloat(numeros[numeros.length - 1]);
            const precioCosto = parseFloat(numeros[numeros.length - 2]) || precioVenta * 0.4;
            let nombre = linea.replace(/\d+\.?\d*/g, '').trim();

            // Limpiar nombre
            nombre = nombre.replace(/[^a-zA-Z0-9áéíóúñ\s%\(\)]/g, '').trim();

            if (nombre.length > 3 && precioVenta > 0 && contador < 100) {
              productos.push({
                codigo_proveedor: `PDF-${contador + 1}`,
                nombre: nombre.substring(0, 100),
                precio_costo: Math.round(precioCosto * 100) / 100,
                precio_venta: Math.round(precioVenta * 100) / 100,
                proveedor_id: selectedProveedor?.id
              });
              contador++;
            }
          }
        }

        if (productos.length > 0) {
          setProductosParseados(productos);
          setError(`✓ Se extrajeron ${productos.length} productos del PDF`);
        } else {
          setError('No se pudieron extraer productos. Asegúrate que el PDF sea de texto (no imagen). Intenta con CSV.');
        }
      } else {
        setError('Solo se aceptan archivos .csv o .pdf');
      }
    } catch (err) {
      setError('Error al procesar archivo: ' + err.message);
    }
  };

  const importarProductos = async () => {
    if (!selectedProveedor) {
      setError('Selecciona un proveedor primero');
      return;
    }

    try {
      for (const prod of productosParseados) {
        await farmaciaAPI.createProducto(prod);
      }
      alert(`${productosParseados.length} productos importados exitosamente`);
      setProductosParseados([]);
      setMostrarUpload(false);
      seleccionarProveedor(selectedProveedor);
    } catch (err) {
      setError('Error al importar: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Catálogos de Proveedores</h1>

      {error && <div style={{ color: '#d32f2f', padding: '1rem', background: '#ffebee', marginBottom: '1rem', borderRadius: '4px' }}>{error}</div>}

      {/* Sección de Upload */}
      <div style={{ background: '#f0f8ff', padding: '1.5rem', marginBottom: '2rem', borderRadius: '8px', border: '2px solid #2196F3' }}>
        <h2 style={{ marginTop: 0 }}>📤 Subir Catálogo</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Selecciona Proveedor:</label>
          <select
            value={selectedProveedor?.id || ''}
            onChange={(e) => {
              const prov = proveedores.find(p => p.id === parseInt(e.target.value));
              if (prov) seleccionarProveedor(prov);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '1rem'
            }}
          >
            <option value="">-- Selecciona un proveedor --</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
            <strong>Formatos aceptados:</strong><br/>
            <strong>CSV:</strong> código,nombre,precio_costo,precio_venta<br/>
            <em>Ejemplo: ASPIR001,Aspirina 500mg,2.50,5.00</em><br/><br/>
            <strong>PDF:</strong> Se extraerá el texto automáticamente
          </p>
        </div>

        <label
          htmlFor="fileInput"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#2196F3',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginRight: '1rem'
          }}
        >
          📁 Seleccionar Archivo (CSV o PDF)
        </label>
        <input
          id="fileInput"
          type="file"
          accept=".csv,.pdf"
          onChange={procesarArchivo}
          style={{ display: 'none' }}
        />

        {productosParseados.length > 0 && (
          <>
            <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '4px', marginTop: '1rem', marginBottom: '1rem' }}>
              <strong>✓ {productosParseados.length} productos listos para importar</strong>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'white', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #ddd' }}>
              {productosParseados.slice(0, 15).map((p, idx) => (
                <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                  <strong>{p.nombre}</strong> ({p.codigo_proveedor}) - ${p.precio_venta}
                </div>
              ))}
              {productosParseados.length > 15 && <div style={{ padding: '0.5rem', color: '#999' }}>...y {productosParseados.length - 15} más</div>}
            </div>

            <button
              onClick={importarProductos}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '0.5rem',
                fontWeight: 'bold'
              }}
            >
              ✓ Importar Productos
            </button>
            <button
              onClick={() => setProductosParseados([])}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕ Cancelar
            </button>
          </>
        )}
      </div>

      <h2>Catálogos Registrados</h2>
      {mostrarNuevoProveedor && (
        <div style={{ background: '#f0f8ff', padding: '1rem', marginBottom: '2rem', borderRadius: '8px', border: '2px solid #2196F3' }}>
          <h3>Crear Nuevo Proveedor</h3>
          <input
            type="text"
            value={nuevoProveedor}
            onChange={(e) => setNuevoProveedor(e.target.value)}
            placeholder="Nombre del proveedor"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '1rem' }}
            onKeyPress={(e) => e.key === 'Enter' && crearProveedor()}
          />
          <button onClick={crearProveedor} style={{ padding: '0.75rem 1rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', marginRight: '0.5rem', cursor: 'pointer' }}>✓ Crear</button>
          <button onClick={() => setMostrarNuevoProveedor(false)} style={{ padding: '0.75rem 1rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {proveedores.length === 0 ? (
          <div>
            <p style={{ color: '#999' }}>No hay proveedores registrados</p>
            <button onClick={() => setMostrarNuevoProveedor(true)} style={{ padding: '0.5rem 1rem', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Crear proveedor</button>
          </div>
        ) : (
          <>
            {proveedores.map(prov => (
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
}
            <button
              onClick={() => setMostrarNuevoProveedor(true)}
              style={{
                padding: '1.5rem',
                background: '#e8f5e9',
                color: '#4CAF50',
                border: '2px dashed #4CAF50',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            >
              + Nuevo Proveedor
            </button>
          </>
        )}
      </div>

      {selectedProveedor && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Catálogo: {selectedProveedor.nombre}</h2>
            <button
              onClick={() => setMostrarUpload(!mostrarUpload)}
              style={{
                padding: '0.5rem 1rem',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📤 {mostrarUpload ? 'Cerrar' : 'Subir Catálogo'}
            </button>
          </div>

          {mostrarUpload && (
            <div style={{ background: '#f9f9f9', padding: '1rem', marginBottom: '1rem', borderRadius: '4px', border: '2px dashed #2196F3' }}>
              <h3>Subir Catálogo</h3>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>Formato CSV: código,nombre,precio_costo,precio_venta</p>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="fileInput"
                  style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    background: '#2196F3',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  📁 Seleccionar Archivo CSV
                </label>
                <input
                  id="fileInput"
                  type="file"
                  accept=".csv,.pdf"
                  onChange={procesarArchivo}
                  style={{ display: 'none' }}
                />
              </div>

              {productosParseados.length > 0 && (
                <>
                  <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                    <strong>✓ {productosParseados.length} productos listos para importar</strong>
                  </div>

                  <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                    {productosParseados.slice(0, 10).map((p, idx) => (
                      <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid #ddd', fontSize: '0.9rem' }}>
                        {p.nombre} - ${p.precio_venta}
                      </div>
                    ))}
                    {productosParseados.length > 10 && <div style={{ padding: '0.5rem', color: '#999' }}>...y {productosParseados.length - 10} más</div>}
                  </div>

                  <button
                    onClick={importarProductos}
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '0.5rem'
                    }}
                  >
                    ✓ Importar Productos
                  </button>
                  <button
                    onClick={() => setProductosParseados([])}
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Cancelar
                  </button>
                </>
              )}
            </div>
          )}

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
