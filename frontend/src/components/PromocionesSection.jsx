import { useState, useEffect } from 'react';
import { getPromociones, createPromocion, updatePromocion, desactivarPromocion } from '../api/promociones';
import { getTratamientosActivos } from '../api/tratamientos';

const inputCls = 'border rounded-lg px-3 py-2 text-sm';
const bStyle = { borderColor: 'var(--color-primary)' };
const VACIA = { nombre: '', descuento_pct: '', fecha_inicio: '', fecha_fin: '', solo_completo: false, tratamiento_ids: [] };
const hoy = () => new Date().toLocaleDateString('en-CA');
const fmt = f => new Date(`${f}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

function estado(p) {
  if (!p.activo) return ['Inactiva', '#9ca3af'];
  if (hoy() < p.fecha_inicio) return ['Programada', '#5a6aa0'];
  if (hoy() > p.fecha_fin) return ['Vencida', '#9ca3af'];
  return ['Vigente', '#3d7a3d'];
}

export default function PromocionesSection() {
  const [promos, setPromos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [form, setForm] = useState(null); // null = cerrado; { id?, ...VACIA }
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState('');

  const cargar = () => getPromociones().then(setPromos).catch(() => setPromos([]));
  useEffect(() => { cargar(); getTratamientosActivos().then(setCatalogo).catch(() => {}); }, []);

  const nombreTrat = id => catalogo.find(t => t.id === id)?.nombre || `#${id}`;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTrat = id => set('tratamiento_ids', form.tratamiento_ids.includes(id)
    ? form.tratamiento_ids.filter(x => x !== id) : [...form.tratamiento_ids, id]);

  async function guardar(e) {
    e.preventDefault(); setError('');
    try {
      const data = { ...form, descuento_pct: Number(form.descuento_pct) };
      if (form.id) await updatePromocion(form.id, data); else await createPromocion(data);
      setForm(null); cargar();
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar'); }
  }

  async function desactivar(p) {
    if (!window.confirm(`¿Desactivar "${p.nombre}"?`)) return;
    await desactivarPromocion(p.id); cargar();
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 mb-6" style={{ borderColor: 'var(--color-sage)' }}>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-medium text-gray-600">Promociones</p>
        {!form && (
          <button onClick={() => { setForm({ ...VACIA }); setError(''); }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
            + Nueva promoción
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={guardar} className="border rounded-lg p-3 mb-4 space-y-3" style={{ borderColor: 'var(--color-sage)' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Nombre (ej. Buen Fin)" value={form.nombre} onChange={e => set('nombre', e.target.value)}
                   className={`${inputCls} md:col-span-2`} style={bStyle} />
            <input type="number" min={1} max={100} step="0.01" placeholder="% descuento" value={form.descuento_pct}
                   onChange={e => set('descuento_pct', e.target.value)} className={inputCls} style={bStyle} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.solo_completo} onChange={e => set('solo_completo', e.target.checked)}
                     className="accent-[var(--color-accent)]" />
              Solo pagando tratamiento completo
            </label>
            <label className="text-xs text-gray-600">Desde
              <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)}
                     className={`${inputCls} w-full mt-1`} style={bStyle} />
            </label>
            <label className="text-xs text-gray-600">Hasta
              <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)}
                     className={`${inputCls} w-full mt-1`} style={bStyle} />
            </label>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Tratamientos ({form.tratamiento_ids.length} elegidos)</p>
            {form.tratamiento_ids.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {form.tratamiento_ids.map(id => (
                  <button type="button" key={id} onClick={() => toggleTrat(id)}
                          className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
                    {nombreTrat(id)} ✕
                  </button>
                ))}
              </div>
            )}
            <input placeholder="Buscar tratamiento…" value={filtro} onChange={e => setFiltro(e.target.value)}
                   className={`${inputCls} w-full mb-1`} style={bStyle} />
            <div className="max-h-40 overflow-y-auto border rounded-lg" style={{ borderColor: 'var(--color-sage)' }}>
              {catalogo.filter(t => t.nombre.toLowerCase().includes(filtro.toLowerCase())).map(t => (
                <label key={t.id} className="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={form.tratamiento_ids.includes(t.id)} onChange={() => toggleTrat(t.id)}
                         className="accent-[var(--color-accent)]" />
                  {t.nombre}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setForm(null)} className="text-xs px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--color-sage)' }}>Cancelar</button>
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}>Guardar</button>
          </div>
        </form>
      )}

      {promos.length === 0 ? <p className="text-sm text-gray-400">Sin promociones.</p> : (
        <div className="space-y-2">
          {promos.map(p => {
            const [txt, color] = estado(p);
            return (
              <div key={p.id} className="flex justify-between gap-3 text-sm border-b pb-2 last:border-b-0" style={{ borderColor: 'var(--color-sage)' }}>
                <div>
                  <p style={{ color: 'var(--color-dark)' }}>
                    <span className="font-semibold">{p.nombre}</span> · {p.descuento_pct}%
                    {p.solo_completo && <span className="text-xs text-gray-500"> · solo tratamiento completo</span>}
                  </p>
                  <p className="text-xs text-gray-500">{fmt(p.fecha_inicio)} – {fmt(p.fecha_fin)} · {p.tratamiento_ids.map(nombreTrat).join(', ')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>{txt}</span>
                  {p.activo && (
                    <>
                      <button onClick={() => { setForm({ ...p }); setError(''); }} className="text-xs underline" style={{ color: 'var(--color-accent)' }}>Editar</button>
                      <button onClick={() => desactivar(p)} className="text-xs text-gray-400 hover:text-red-500">Desactivar</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
