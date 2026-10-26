// Dos razones sociales en Finanzas. La vista elegida se guarda en localStorage y
// api/client.js la manda como ?empresa= en los GET de finanzas ('todas' = consolidado).
export const EMPRESAS = { giovanna: 'Giovanna PF', elys: 'Elys PM' };

export const empresaVista = () => {
  try { return localStorage.getItem('finanzasEmpresa') || 'todas'; } catch { return 'todas'; }
};

// Empresa sugerida para capturar: la de la vista; en consolidado no hay sugerencia (la cajera elige).
export const empresaSugerida = () => (EMPRESAS[empresaVista()] ? empresaVista() : '');

export function EmpresaToggle({ value, onChange, conTodas = false, className = '' }) {
  const opciones = conTodas ? { todas: 'Consolidado', ...EMPRESAS } : EMPRESAS;
  return (
    <div className={`inline-flex rounded-lg border overflow-hidden ${className}`} style={{ borderColor: 'var(--color-sage)' }}>
      {Object.entries(opciones).map(([k, label]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
                className="px-3 py-1.5 text-xs font-medium"
                style={value === k
                  ? { backgroundColor: 'var(--color-accent)', color: 'white' }
                  : { color: 'var(--color-dark)' }}>
          {label}
        </button>
      ))}
    </div>
  );
}
