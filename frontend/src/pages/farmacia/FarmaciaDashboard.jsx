import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FarmaciaContext } from '../../context/FarmaciaContext';
import * as farmaciaAPI from '../../api/farmacia';

const FarmaciaDashboard = () => {
  const navigate = useNavigate();
  const { cajaAbierta, setCajaAbierta } = useContext(FarmaciaContext);
  const [efectivoInicial, setEfectivoInicial] = useState('');
  const [efectivoFinal, setEfectivoFinal] = useState('');
  const [cerrandoCaja, setCerrandoCaja] = useState(false);

  useEffect(() => {
    farmaciaAPI.getCajaAbierta().then(setCajaAbierta);
  }, [setCajaAbierta]);

  const abrirCaja = async () => {
    try {
      const caja = await farmaciaAPI.abrirCaja(parseFloat(efectivoInicial));
      setCajaAbierta(caja);
      setEfectivoInicial('');
      alert('Caja abierta');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const cerrarCaja = async () => {
    try {
      await farmaciaAPI.cerrarCaja(cajaAbierta.id, parseFloat(efectivoFinal));
      setCajaAbierta(null);
      setEfectivoFinal('');
      setCerrandoCaja(false);
      alert('Caja cerrada');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '600px' }}>
      <h1>Farmacia</h1>

      {!cajaAbierta ? (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
          <h2>Abrir Caja</h2>
          <input
            type="number"
            value={efectivoInicial}
            onChange={(e) => setEfectivoInicial(e.target.value)}
            placeholder="Efectivo inicial"
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />
          <button onClick={abrirCaja} style={{ width: '100%', padding: '0.75rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Abrir Caja
          </button>
        </div>
      ) : (
        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
          <p>✅ Caja abierta desde: {new Date(cajaAbierta.fecha_apertura).toLocaleTimeString()}</p>
          <p>Efectivo inicial: ${cajaAbierta.efectivo_inicial}</p>

          {!cerrandoCaja ? (
            <button onClick={() => setCerrandoCaja(true)} style={{ padding: '0.5rem 1rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Cerrar Caja
            </button>
          ) : (
            <div>
              <input
                type="number"
                value={efectivoFinal}
                onChange={(e) => setEfectivoFinal(e.target.value)}
                placeholder="Efectivo final"
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
              <button onClick={cerrarCaja} style={{ width: '100%', padding: '0.5rem', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '0.5rem', cursor: 'pointer' }}>
                Confirmar Cierre
              </button>
              <button onClick={() => setCerrandoCaja(false)} style={{ width: '100%', padding: '0.5rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
        <button onClick={() => navigate('/farmacia/pos')} style={{ padding: '1rem', background: '#2196F3', color: 'white', textAlign: 'center', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
          🛒 Punto de Venta
        </button>
        <button onClick={() => navigate('/farmacia/inventario')} style={{ padding: '1rem', background: '#FF9800', color: 'white', textAlign: 'center', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
          📋 Inventario
        </button>
      </div>
    </div>
  );
};

export default FarmaciaDashboard;
