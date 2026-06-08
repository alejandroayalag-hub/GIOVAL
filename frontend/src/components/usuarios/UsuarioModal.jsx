// frontend/src/components/usuarios/UsuarioModal.jsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createUsuario, updateUsuario } from '../../api/usuarios';

const ROL_LABELS = {
  asistente_medico:  'Asistente Médico',
  cosmetista:        'Cosmetista',
  asistente_general: 'Asistente General',
};

export default function UsuarioModal({ usuario, onSave, onClose }) {
  const esNuevo = !usuario;
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', rol: 'asistente_medico', cedula_profesional: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (usuario) setForm({
      nombre: usuario.nombre || '',
      email: usuario.email || '',
      password: '',
      rol: usuario.rol || 'asistente_medico',
      cedula_profesional: usuario.cedula_profesional || '',
    });
  }, [usuario]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const saved = esNuevo
        ? await createUsuario(payload)
        : await updateUsuario(usuario.id, payload);
      onSave(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--color-dark)' }}>
              {esNuevo ? 'Nuevo usuario' : 'Editar usuario'}
            </h2>
            <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--color-accent)' }} /></button>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {[['nombre','Nombre completo','text'],['email','Email','email']].map(([k, label, type]) => (
              <div key={k}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>{label}</label>
                <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} required
                       className="w-full border rounded-lg px-3 py-2 text-sm"
                       style={{ borderColor: 'var(--color-sage)' }} />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
                {esNuevo ? 'Contraseña' : 'Nueva contraseña (dejar vacío para no cambiar)'}
              </label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                     required={esNuevo} minLength={6}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-sage)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>Rol</label>
              <select value={form.rol} onChange={e => set('rol', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-sage)' }}>
                {Object.entries(ROL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {(form.rol === 'asistente_medico') && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
                  Cédula profesional
                </label>
                <input type="text" value={form.cedula_profesional}
                       onChange={e => set('cedula_profesional', e.target.value)}
                       className="w-full border rounded-lg px-3 py-2 text-sm"
                       style={{ borderColor: 'var(--color-sage)' }} />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose}
                      className="flex-1 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="flex-1 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
