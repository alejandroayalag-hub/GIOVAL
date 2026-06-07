// frontend/src/components/finanzas/CategoriaModal.jsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const COLORES = ['#4a7c6a','#c0675a','#887482','#aba3ba','#6b7280','#d97706','#2563eb','#7c3aed'];

export default function CategoriaModal({ categoria, onSave, onClose }) {
  const isEditing = Boolean(categoria);
  const [form, setForm] = useState({ nombre: '', tipo: 'ingreso', color: '#887482' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (categoria) setForm({ nombre: categoria.nombre, tipo: categoria.tipo, color: categoria.color });
  }, [categoria]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es requerido');
    setLoading(true); setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-dark)' }}>
            {isEditing ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Nombre *
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Tipo
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-dark)' }}>
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORES.map(c => (
                <button key={c} type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className="w-7 h-7 rounded-full border-2 transition-all"
                        style={{ backgroundColor: c, borderColor: form.color === c ? '#111' : 'transparent' }} />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
                    className="flex-1 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
                    className="flex-1 py-2 text-sm text-white rounded-lg font-medium"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
