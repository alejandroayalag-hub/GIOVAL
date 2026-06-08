import { useState, useEffect } from 'react';
import { createPaciente, updatePaciente } from '../api/pacientes';

const EMPTY = {
  apellido_paterno: '', apellido_materno: '', nombre: '',
  fecha_registro: new Date().toISOString().split('T')[0],
  fecha_nacimiento: '', edad: '', sexo: '', ocupacion: '',
  estado_civil: '', escolaridad: '', grupo_etnico: '',
  telefono: '', telefono_alterno: '', email: '',
  direccion: '', colonia: '', ciudad: '', estado: '', codigo_postal: '',
  contacto_emergencia: '', parentesco_emergencia: '', telefono_emergencia: '',
  referido_por: '',
  anotaciones: '',
};

export default function PacienteFormModal({ paciente, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (paciente) setForm({ ...EMPTY, ...paciente });
    else setForm(EMPTY);
  }, [paciente]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const saved = paciente
        ? await updatePaciente(paciente.id, form)
        : await createPaciente(form);
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-dark)' }}>
            {paciente ? 'Editar paciente' : 'Nueva paciente'}
          </h2>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">

            {/* Datos personales */}
            {/* Datos personales */}
            {[
              ['apellido_paterno', 'Apellido paterno *', true],
              ['apellido_materno', 'Apellido materno', false],
              ['nombre', 'Nombre(s) *', true],
              ['ocupacion', 'Ocupación / Profesión', false],
              ['escolaridad', 'Escolaridad', false],
              ['grupo_etnico', 'Grupo étnico (si aplica)', false],
            ].map(([key, label, required]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="text" required={required} value={form[key]}
                       onChange={e => set(key, e.target.value)}
                       className="w-full border rounded-lg px-3 py-2 text-sm"
                       style={{ borderColor: 'var(--color-primary)' }} />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sexo</label>
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>
                <option value="">— Seleccionar —</option>
                <option>Femenino</option><option>Masculino</option><option>Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado civil</label>
              <select value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>
                <option value="">— Seleccionar —</option>
                <option>Soltera</option><option>Casada</option><option>Divorciada</option>
                <option>Viuda</option><option>Unión libre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de nacimiento</label>
              <input type="date" value={form.fecha_nacimiento}
                     onChange={e => set('fecha_nacimiento', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Edad</label>
              <input type="number" min="0" max="120" value={form.edad}
                     onChange={e => set('edad', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            {/* Contacto */}
            <div className="col-span-2 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                 style={{ color: 'var(--color-accent)' }}>Contacto</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono principal</label>
              <input type="text" value={form.telefono} onChange={e => set('telefono', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono alterno</label>
              <input type="text" value={form.telefono_alterno} onChange={e => set('telefono_alterno', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contacto de emergencia</label>
              <input type="text" value={form.contacto_emergencia} onChange={e => set('contacto_emergencia', e.target.value)}
                     placeholder="Nombre completo"
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Parentesco</label>
              <input type="text" value={form.parentesco_emergencia} onChange={e => set('parentesco_emergencia', e.target.value)}
                     placeholder="Ej. Madre, Esposo..."
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono de emergencia</label>
              <input type="text" value={form.telefono_emergencia} onChange={e => set('telefono_emergencia', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Referido por</label>
              <input type="text" value={form.referido_por} onChange={e => set('referido_por', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            {/* Domicilio */}
            <div className="col-span-2 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                 style={{ color: 'var(--color-accent)' }}>Domicilio</p>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Calle y número</label>
              <input type="text" value={form.direccion}
                     onChange={e => set('direccion', e.target.value)}
                     placeholder="Av. Ejemplo 123 Int. 4"
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Colonia</label>
              <input type="text" value={form.colonia}
                     onChange={e => set('colonia', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad / Municipio</label>
              <input type="text" value={form.ciudad}
                     onChange={e => set('ciudad', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <input type="text" value={form.estado}
                     onChange={e => set('estado', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código postal</label>
              <input type="text" maxLength="5" value={form.codigo_postal}
                     onChange={e => set('codigo_postal', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Anotaciones</label>
              <textarea rows={2} value={form.anotaciones}
                        onChange={e => set('anotaciones', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div className="col-span-2 flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose}
                      className="px-4 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
