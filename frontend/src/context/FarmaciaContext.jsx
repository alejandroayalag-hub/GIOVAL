import { createContext, useState, useCallback } from 'react';

export const FarmaciaContext = createContext();

export const FarmaciaProvider = ({ children }) => {
  const [ventaActual, setVentaActual] = useState(null);
  const [items, setItems] = useState([]);
  const [cajaAbierta, setCajaAbierta] = useState(null);

  const agregarItem = useCallback((producto, cantidad) => {
    setItems(prev => {
      const existe = prev.find(i => i.producto_id === producto.id);
      if (existe) {
        return prev.map(i =>
          i.producto_id === producto.id
            ? { ...i, cantidad: i.cantidad + cantidad, subtotal: (i.cantidad + cantidad) * i.precio_unitario }
            : i
        );
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: producto.precio_venta,
        subtotal: cantidad * producto.precio_venta
      }];
    });
  }, []);

  const removerItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarCantidad = (index, cantidad) => {
    if (cantidad <= 0) {
      removerItem(index);
    } else {
      setItems(prev => prev.map((item, i) =>
        i === index
          ? { ...item, cantidad, subtotal: cantidad * item.precio_unitario }
          : item
      ));
    }
  };

  const limpiar = () => {
    setVentaActual(null);
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const value = {
    ventaActual,
    setVentaActual,
    items,
    cajaAbierta,
    setCajaAbierta,
    agregarItem,
    removerItem,
    actualizarCantidad,
    limpiar,
    total
  };

  return (
    <FarmaciaContext.Provider value={value}>
      {children}
    </FarmaciaContext.Provider>
  );
};
