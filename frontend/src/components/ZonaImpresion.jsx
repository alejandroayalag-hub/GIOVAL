import logoGioval from '../assets/gioval-logo.png';

// Envuelve una pestaña del expediente: botón 🖨 + encabezado que solo aparece al imprimir.
// Al imprimir solo se ve .print-area; los botones y lo marcado print:hidden se ocultan (index.css).
export default function ZonaImpresion({ titulo, paciente, children }) {
  return (
    <div className="print-area">
      <div className="flex justify-end mb-3 print:hidden">
        <button type="button" onClick={() => window.print()}
                className="text-sm border rounded-lg px-3 py-1"
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-dark)' }}>
          🖨 Imprimir {titulo.toLowerCase()}
        </button>
      </div>
      <div className="hidden print:flex items-center justify-between mb-4 pb-2 border-b">
        <img src={logoGioval} alt="Gioval" className="h-12 object-contain" />
        <div className="text-right text-xs">
          <p className="text-base font-semibold">{titulo}</p>
          {paciente && <p>{[paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(' ')} · Exp. GVL-{String(paciente.id).padStart(6, '0')}</p>}
          <p>Impreso el {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
