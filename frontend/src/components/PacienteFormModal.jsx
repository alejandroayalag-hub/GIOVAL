import { useState, useEffect, useRef } from 'react';
import { createPaciente, updatePaciente, uploadFotoPaciente } from '../api/pacientes';

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

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3008/api').replace('/api', '');

export default function PacienteFormModal({ paciente, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const fotoInputRef = useRef(null);

  useEffect(() => {
    if (paciente) setForm({ ...EMPTY, ...paciente });
    else setForm(EMPTY);
    setFotoFile(null);
    setFotoPreview(null);
  }, [paciente]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      let saved = paciente
        ? await updatePaciente(paciente.id, form)
        : await createPaciente(form);
      if (fotoFile) {
        saved = await uploadFotoPaciente(saved.id, fotoFile);
      }
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

            {/* Foto */}
            <div className="col-span-2 flex items-center gap-4 pb-3 border-b" style={{ borderColor: 'var(--color-sage)' }}>
              <button type="button" onClick={() => fotoInputRef.current?.click()}
                      className="relative flex-shrink-0 group focus:outline-none">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-100"
                     style={{ borderColor: 'var(--color-sage)' }}>
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : paciente?.foto ? (
                    <img src={`${API_BASE}/${paciente.foto}`} alt="foto" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold select-none" style={{ color: 'var(--color-accent)' }}>
                      {form.apellido_paterno?.[0]}{form.nombre?.[0]}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-dark)' }}>Foto del paciente</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG o PNG · Haz clic en el círculo para seleccionar</p>
                {fotoFile && <p className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>{fotoFile.name}</p>}
              </div>
              <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            </div>

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
