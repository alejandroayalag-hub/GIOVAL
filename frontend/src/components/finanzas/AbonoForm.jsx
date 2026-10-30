import { useState } from 'react';
import { registrarAbono } from '../../api/finanzas';
import { pesos } from '../../utils/presupuesto';
import { EMPRESAS, EmpresaToggle, empresaSugerida } from './empresa';

const FORMAS = [
  { key: 'efectivo',      label: 'Efectivo',      color: '#4a7c6a' },
  { key: 'tarjeta',       label: 'Tarjeta',       color: '#5a6aa0' },
  { key: 'transferencia', label: 'Transferencia', color: '#7a6ab0' },
];

// Sugerido: completar la mitad del paquete; ya cubierta la mitad, el saldo
export const abonoSugerido = p =>
  Math.round(100 * Math.min(p.saldo, p.abonado < p.subtotal / 2 ? p.subtotal / 2 - p.abonado : p.saldo)) / 100;

// Abono a un tratamiento completo. `empresa` viene de Caja; si no viene, se elige aquí.
export default function AbonoForm({ itemId, paquete, empresa, onDone }) {
  const [monto, setMonto] = useState(() => abonoSugerido(paquete));
  const [emp, setEmp] = useState(empresaSugerida);
  const [guardando, setGuardando] = useState(null);
  const empresaFinal = empresa ?? emp;

  async function abonar(forma) {
    if (!empresaFinal) { alert('Elige a qué empresa se cobra: Giovanna PF o Elys PM'); return; }
    if (!window.confirm(`¿Registrar abono de ${pesos(monto)} en ${forma} a ${EMPRESAS[empresaFinal]}?`)) return;
    setGuardando(forma);
    try {
      await registrarAbono({ presupuesto_item_id: itemId, monto, forma_pago: forma, empresa: empresaFinal });
      await onDone?.();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al registrar abono');
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500">Abono $</span>
      <input type="number" min="1" step="0.01" max={paquete.saldo} value={monto}
             onChange={e => setMonto(e.target.value)}
             className="w-24 border rounded-lg px-2 py-1 text-xs" style={{ borderColor: 'var(--color-sage)' }} />
      {empresa === undefined && <EmpresaToggle value={emp} onChange={setEmp} />}
      {FORMAS.map(({ key, label, color }) => (
        <button key={key} type="button" disabled={!!guardando} onClick={() => abonar(key)}
                className="text-xs px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: color }}>
          {guardando === key ? '...' : label}
        </button>
      ))}
    </div>
  );
}
