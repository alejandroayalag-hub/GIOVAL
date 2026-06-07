import { useState } from 'react';
import { createPaciente } from '../api/pacientes';

export default function PacienteMiniModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ apellido_paterno: '', nombre: '', telefono: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const paciente = await createPaciente({
        ...form,
        fecha_registro: new Date().toISOString().split('T')[0],
      });
      onCreated(paciente);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-dark)' }}>
            Registrar paciente rápido
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Completa el expediente completo después desde el módulo Pacientes.
          </p>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido paterno *</label>
              <input type="text" required value={form.apellido_paterno}
                     onChange={e => set('apellido_paterno', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre(s) *</label>
              <input type="text" required value={form.nombre}
                     onChange={e => set('nombre', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input type="text" value={form.telefono}
                     onChange={e => set('telefono', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={onClose}
                      className="px-3 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
