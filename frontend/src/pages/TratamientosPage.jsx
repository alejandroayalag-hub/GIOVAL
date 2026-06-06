import { useState, useEffect } from 'react';
import { getTratamientos, createTratamiento, updateTratamiento } from '../api/tratamientos';

export default function TratamientosPage() {
  const rol = localStorage.getItem('rol');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nombre: '', duracion_min: 60 });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargar = () => getTratamientos().then(setItems).catch(console.error);
  useEffect(() => { cargar(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (editId) {
        await updateTratamiento(editId, form);
      } else {
        await createTratamiento(form);
      }
      setForm({ nombre: '', duracion_min: 60 });
      setEditId(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  function iniciarEditar(t) {
    setEditId(t.id);
    setForm({ nombre: t.nombre, duracion_min: t.duracion_min, activo: t.activo });
  }

  async function toggleActivo(t) {
    await updateTratamiento(t.id, { activo: !t.activo });
    cargar();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--color-dark)' }}>Catálogo de Tratamientos</h1>

      {rol === 'admin' && (
        <form onSubmit={handleSubmit}
              className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex gap-3 items-end flex-wrap"
              style={{ borderColor: 'var(--color-sage)' }}>
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del tratamiento</label>
            <input type="text" required value={form.nombre}
                   onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-600 mb-1">Duración (min)</label>
            <input type="number" min="5" required value={form.duracion_min}
                   onChange={e => setForm(f => ({ ...f, duracion_min: parseInt(e.target.value) }))}
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
              {editId ? 'Actualizar' : 'Agregar'}
            </button>
            {editId && (
              <button type="button"
                      onClick={() => { setEditId(null); setForm({ nombre: '', duracion_min: 60 }); }}
                      className="rounded-lg px-3 py-2 text-sm border"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-xs w-full mt-1">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: 'var(--color-sage)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-primary)' }}>
              <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--color-dark)' }}>Tratamiento</th>
              <th className="px-4 py-2 text-center font-semibold" style={{ color: 'var(--color-dark)' }}>Duración</th>
              <th className="px-4 py-2 text-center font-semibold" style={{ color: 'var(--color-dark)' }}>Estatus</th>
              {rol === 'admin' && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="border-t hover:bg-gray-50" style={{ borderColor: 'var(--color-sage)' }}>
                <td className="px-4 py-2">{t.nombre}</td>
                <td className="px-4 py-2 text-center text-gray-500">{t.duracion_min} min</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {rol === 'admin' && (
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => iniciarEditar(t)}
                              className="text-xs px-2 py-1 rounded border"
                              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-dark)' }}>
                        Editar
                      </button>
                      <button onClick={() => toggleActivo(t)}
                              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500">
                        {t.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
