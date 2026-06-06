import { useState, useEffect } from 'react';
import { getTratamientosActivos } from '../api/tratamientos';
import { getEmpleados } from '../api/empleados';
import { createCita, updateCita, deleteCita } from '../api/citas';

const ESTATUSES = ['pendiente', 'realizada', 'cancelada'];

export default function CitaModal({ cita, fechaHoraInicial, empleadaIdInicial, onClose, onSaved }) {
  const rol = localStorage.getItem('rol');
  const esNueva = !cita?.id;

  const [form, setForm] = useState({
    nombre_paciente: cita?.nombre_paciente || '',
    telefono: cita?.telefono || '',
    tratamiento_id: cita?.tratamiento_id || '',
    empleada_id: cita?.empleada_id || empleadaIdInicial || '',
    fecha_hora: cita?.fecha_hora
      ? new Date(cita.fecha_hora).toISOString().slice(0, 16)
      : (fechaHoraInicial || ''),
    notas: cita?.notas || '',
    estatus: cita?.estatus || 'pendiente',
  });
  const [tratamientos, setTratamientos] = useState([]);
  const [empleadas, setEmpleadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTratamientosActivos().then(setTratamientos).catch(console.error);
    getEmpleados().then(data => setEmpleadas(data.filter(e => e.estatus === 'activo'))).catch(console.error);
  }, []);

  const puedeEliminar = rol === 'admin' || cita?.estatus !== 'realizada';
  const puedeEditar = esNueva || rol === 'admin' || cita?.estatus !== 'realizada';

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!puedeEditar) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        tratamiento_id: form.tratamiento_id || null,
        empleada_id: form.empleada_id || null,
      };
      if (esNueva) {
        await createCita(payload);
      } else {
        await updateCita(cita.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta cita?')) return;
    setLoading(true);
    try {
      await deleteCita(cita.id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--color-dark)' }}>
            {esNueva ? 'Nueva cita' : 'Editar cita'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {!puedeEditar && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
            Esta cita ya fue realizada y no puede editarse.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Paciente *</label>
            <input
              type="text" required disabled={!puedeEditar}
              value={form.nombre_paciente}
              onChange={e => set('nombre_paciente', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input
              type="text" disabled={!puedeEditar}
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tratamiento</label>
            <select
              value={form.tratamiento_id} disabled={!puedeEditar}
              onChange={e => set('tratamiento_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            >
              <option value="">— Seleccionar —</option>
              {tratamientos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.duracion_min} min)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha y hora *</label>
            <input
              type="datetime-local" required disabled={!puedeEditar}
              value={form.fecha_hora}
              onChange={e => set('fecha_hora', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quien atiende</label>
            <select
              value={form.empleada_id} disabled={!puedeEditar}
              onChange={e => set('empleada_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            >
              <option value="">— Seleccionar —</option>
              {empleadas.map(e => (
                <option key={e.id} value={e.id}>{e.nombre} {e.apellido_paterno}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estatus</label>
            <select
              value={form.estatus} disabled={!puedeEditar}
              onChange={e => set('estatus', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            >
              {ESTATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              rows={2} disabled={!puedeEditar}
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            {puedeEditar && (
              <button type="submit" disabled={loading}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando...' : (esNueva ? 'Crear cita' : 'Guardar cambios')}
              </button>
            )}
            {!esNueva && puedeEliminar && (
              <button type="button" onClick={handleDelete} disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                Eliminar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
