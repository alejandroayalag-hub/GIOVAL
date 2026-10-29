import { useState, useEffect, useRef } from 'react';
import { searchCie10 } from '../api/expediente';

const cardBorder = { borderColor: 'var(--color-sage)' };

// value: { codigo, descripcion } | null
export default function Cie10Picker({ value, onChange }) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResultados([]); return; }
    timer.current = setTimeout(() => {
      searchCie10(q.trim()).then(setResultados).catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono font-semibold text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-accent)' }}>
          {value.codigo}
        </span>
        <span className="text-sm">{value.descripcion}</span>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-gray-400 hover:text-red-500">✕ cambiar</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input type="text" value={q} onChange={e => setQ(e.target.value)}
             placeholder="Busca por código o descripción (ej. E11 o diabetes)…"
             className="w-full border rounded-lg px-3 py-2 text-sm"
             style={{ borderColor: 'var(--color-primary)' }} />
      {resultados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto" style={cardBorder}>
          {resultados.map(r => (
            <button key={r.codigo} type="button"
                    onClick={() => { onChange(r); setQ(''); setResultados([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0" style={cardBorder}>
              <span className="font-mono font-semibold mr-2" style={{ color: 'var(--color-accent)' }}>{r.codigo}</span>
              {r.descripcion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
