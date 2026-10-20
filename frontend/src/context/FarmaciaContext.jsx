import { createContext, useState, useCallback } from 'react';
import * as farmaciaAPI from '../api/farmacia';

export const FarmaciaContext = createContext();

// Carrito y caja viven aquí para no perderse al navegar entre pantallas de farmacia
export const FarmaciaProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [cajaAbierta, setCajaAbierta] = useState(null);

  const cargarCaja = useCallback(() => farmaciaAPI.getCajaAbierta().then(c => { setCajaAbierta(c); return c; }), []);

  const agregarItem = useCallback((producto, cantidad = 1) => {
    setItems(prev => {
      if (prev.some(i => i.producto_id === producto.id)) {
        return prev.map(i => i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i);
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: parseFloat(producto.precio_venta),
        stock: producto.stock,
      }];
    });
  }, []);

  const removerItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  // Cantidad inválida o vacía → 1 (para quitar se usa ✕)
  const actualizarCantidad = (index, valor) => {
    const cantidad = Math.max(1, parseInt(valor, 10) || 1);
    setItems(prev => prev.map((item, i) => i === index ? { ...item, cantidad } : item));
  };

  const limpiar = () => setItems([]);

  const total = Math.round(items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0) * 100) / 100;

  return (
    <FarmaciaContext.Provider value={{
      items, agregarItem, removerItem, actualizarCantidad, limpiar, total,
      cajaAbierta, setCajaAbierta, cargarCaja,
    }}>
      {children}
    </FarmaciaContext.Provider>
  );
};
