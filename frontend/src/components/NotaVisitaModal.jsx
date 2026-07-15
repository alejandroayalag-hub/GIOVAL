import { useState, useEffect } from 'react';
import { createNota, updateNota } from '../api/notasVisita';
import BotonDictado from './BotonDictado';

const EMPTY_SV = { fc: '', fr: '', ta: '', temperatura: '', saturacion: '', peso: '', talla: '' };

export default function NotaVisitaModal({ cita, pacienteId, nota, onClose, onSaved }) {
  const rol = localStorage.getItem('rol');
  const esCosmética = rol === 'cosmetista';

  const [form, setForm] = useState({
    evolucion: '', diagnostico: '', pronostico: '',
    tratamiento_indicaciones: '', signos_vitales: EMPTY_SV,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (nota) {
      setForm({
        evolucion: nota.evolucion || '',
        diagnostico: nota.diagnostico || '',
        pronostico: nota.pronostico || '',
        tratamiento_indicaciones: nota.tratamiento_indicaciones || '',
        signos_vitales: nota.signos_vitales || EMPTY_SV,
      });
    }
  }, [nota]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSV = (k, v) => setForm(f => ({ ...f, signos_vitales: { ...f.signos_vitales, [k]: v } }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const tipo = esCosmética ? 'cosmetico' : 'medico';
      const saved = nota
        ? await updateNota(nota.id, form)
        : await createNota({ ...form, tipo, cita_id: cita.id, paciente_id: pacienteId });
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
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-dark)' }}>
            {esCosmética ? 'Nota de Tratamiento Cosmético' : 'Nota de Evolución'}
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Cita: {cita ? new Date(cita.fecha_hora).toLocaleString('es-MX') : ''} · {cita?.tratamiento_nombre || ''}
          </p>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {esCosmética ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium" style={{ color: 'var(--color-dark)' }}>
                    Nota del tratamiento cosmético
                  </label>
                  <BotonDictado onTexto={t => setForm(f => ({ ...f, evolucion: (f.evolucion ? f.evolucion + ' ' : '') + t }))} />
                </div>
                <textarea
                  value={form.evolucion}
                  onChange={e => set('evolucion', e.target.value)}
                  rows={5}
                  placeholder="Describe el tratamiento realizado, productos usados y observaciones..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  style={{ borderColor: 'var(--color-sage)' }}
                />
              </div>
            ) : (
              <>
                {[
                  ['evolucion', 'Evolución clínica', 4],
                  ['diagnostico', 'Diagnóstico', 2],
                  ['pronostico', 'Pronóstico', 2],
                  ['tratamiento_indicaciones', 'Tratamiento e indicaciones (dosis, vía, periodicidad)', 3],
                ].map(([k, label, rows]) => (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-600">{label}</label>
                      <BotonDictado onTexto={t => setForm(f => ({ ...f, [k]: (f[k] ? f[k] + ' ' : '') + t }))} />
                    </div>
                    <textarea rows={rows} value={form[k]}
                              onChange={e => set(k, e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 text-sm"
                              style={{ borderColor: 'var(--color-primary)' }} />
                  </div>
                ))}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                    Signos Vitales (opcional)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[['fc','FC'], ['fr','FR'], ['ta','TA'], ['temperatura','Temp.'],
                      ['saturacion','Sat.'], ['peso','Peso'], ['talla','Talla']].map(([k, label]) => (
                      <div key={k}>
                        <label className="block text-xs text-gray-500 mb-1">{label}</label>
                        <input type="text" value={form.signos_vitales[k] || ''}
                               onChange={e => setSV(k, e.target.value)}
                               className="w-full border rounded-lg px-3 py-2 text-sm"
                               style={{ borderColor: 'var(--color-primary)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose}
                      className="px-4 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
