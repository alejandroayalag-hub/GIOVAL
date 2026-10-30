import { pesos } from '../utils/presupuesto';

// Estado del tratamiento completo de una cita (viene de abonos.conPaquete en el backend)
export default function PaqueteInfo({ paquete }) {
  return (
    <div className="text-xs mt-1">
      <p className="text-gray-600">
        Paquete · sesión {paquete.sesion_n} de {paquete.sesiones} · abonado {pesos(paquete.abonado)} de {pesos(paquete.subtotal)}
        {paquete.saldo > 0
          ? <span className="font-semibold text-amber-700"> · saldo {pesos(paquete.saldo)}</span>
          : <span style={{ color: '#3d7a3d' }}> · liquidado</span>}
      </p>
      {paquete.aviso_50 && (
        <p className="text-amber-700 font-medium">⚠ Ya va a la mitad del tratamiento y lleva menos del 50% abonado</p>
      )}
    </div>
  );
}
