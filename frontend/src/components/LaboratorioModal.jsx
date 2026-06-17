import { useState } from 'react';
import { uploadLaboratorio } from '../api/laboratorios';

export default function LaboratorioModal({ pacienteId, onSaved, onClose }) {
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [notas, setNotas] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre es requerido');
    if (!archivo) return setError('Selecciona un archivo');
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('paciente_id', pacienteId);
      fd.append('nombre', nombre.trim());
      if (fecha) fd.append('fecha', fecha);
      if (notas.trim()) fd.append('notas', notas.trim());
      fd.append('archivo', archivo);
      const lab = await uploadLaboratorio(fd);
      onSaved(lab);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir archivo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
           style={{ borderColor: 'var(--color-sage)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-dark)' }}>
            Subir análisis de laboratorio
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Biometría hemática jun-2026"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Fecha del análisis
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Notas
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones opcionales…"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              style={{ borderColor: 'var(--color-sage)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Archivo <span className="text-red-400">*</span>
              <span className="text-xs text-gray-400 ml-1">(PDF, JPG, PNG — máx 20MB)</span>
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setArchivo(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
            {archivo && (
              <p className="text-xs text-gray-500 mt-1">{archivo.name}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
                    className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
              {saving ? 'Subiendo…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
