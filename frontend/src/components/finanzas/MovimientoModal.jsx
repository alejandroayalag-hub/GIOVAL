// frontend/src/components/finanzas/MovimientoModal.jsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function MovimientoModal({ tipo: tipoInicial, movimiento, categorias, onSave, onClose }) {
  const isEditing = Boolean(movimiento);
  const tipo = isEditing ? movimiento.tipo : tipoInicial;

  const [form, setForm] = useState({
    concepto: '', categoria_id: '', monto: '',
    forma_pago: 'efectivo',
    fecha: new Date().toISOString().split('T')[0],
    notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (movimiento) {
      setForm({
        concepto:     movimiento.concepto || '',
        categoria_id: movimiento.categoria_id || '',
        monto:        movimiento.monto || '',
        forma_pago:   movimiento.forma_pago || 'efectivo',
        fecha:        movimiento.fecha?.split('T')[0] || new Date().toISOString().split('T')[0],
        notas:        movimiento.notas || '',
      });
    }
  }, [movimiento]);

  const categsFiltradas = categorias.filter(c => c.tipo === tipo || c.tipo === 'ambos');
  const colorTipo = tipo === 'ingreso' ? '#4a7c6a' : '#c0675a';
  const labelTipo = tipo === 'ingreso' ? 'Ingreso' : 'Egreso';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.concepto.trim()) return setError('El concepto es requerido');
    if (!form.monto || parseFloat(form.monto) <= 0) return setError('El monto debe ser mayor a 0');
    setLoading(true); setError('');
    try {
      await onSave({
        ...form, tipo,
        monto: parseFloat(form.monto),
        categoria_id: form.categoria_id || null,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorTipo }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-dark)' }}>
              {isEditing ? `Editar ${labelTipo}` : `Nuevo ${labelTipo}`}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Concepto *
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
              value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
              placeholder="Descripción del movimiento"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
                Monto *
              </label>
              <input
                type="number" min="0.01" step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-sage)' }}
                value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
                Fecha *
              </label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-sage)' }}
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Categoría
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
              value={form.categoria_id}
              onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
            >
              <option value="">Sin categoría</option>
              {categsFiltradas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Forma de pago
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
              value={form.forma_pago}
              onChange={e => setForm(f => ({ ...f, forma_pago: e.target.value }))}
            >
              {['efectivo','transferencia','tarjeta','otro'].map(fp => (
                <option key={fp} value={fp}>{fp.charAt(0).toUpperCase() + fp.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Notas
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              style={{ borderColor: 'var(--color-sage)' }}
              rows={2}
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            />
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
                    style={{ backgroundColor: colorTipo }}>
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
