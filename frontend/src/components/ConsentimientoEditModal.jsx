import { useState, useEffect } from 'react';
import { getConsentimiento, saveConsentimiento } from '../api/consentimientos';

export default function ConsentimientoEditModal({ tratamiento, onClose, onSaved }) {
  const [form, setForm] = useState({
    titulo: '',
    texto_consentimiento: '',
    cuidados_pre: '',
    cuidados_post: '',
    activo: true,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getConsentimiento(tratamiento.id)
      .then(d => { if (d?.id) setForm({ titulo: d.titulo || '', texto_consentimiento: d.texto_consentimiento || '', cuidados_pre: d.cuidados_pre || '', cuidados_post: d.cuidados_post || '', activo: d.activo ?? true }); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [tratamiento.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await saveConsentimiento(tratamiento.id, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <div className="p-5 border-b flex justify-between items-start" style={{ borderColor: 'var(--color-sage)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--color-dark)' }}>Consentimiento informado</h2>
            <p className="text-xs text-gray-500 mt-0.5">{tratamiento.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando…</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título del consentimiento</label>
              <input type="text" value={form.titulo}
                     onChange={e => set('titulo', e.target.value)}
                     placeholder="ej. Consentimiento Informado — Toxina Botulínica"
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Texto del consentimiento *</label>
              <p className="text-xs text-gray-400 mb-1">Describe el procedimiento, riesgos, alternativas y declaración del paciente.</p>
              <textarea rows={10} value={form.texto_consentimiento}
                        onChange={e => set('texto_consentimiento', e.target.value)}
                        placeholder="Yo, el/la paciente, declaro haber sido informado/a sobre el procedimiento…"
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                        style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cuidados previos al tratamiento</label>
              <textarea rows={4} value={form.cuidados_pre}
                        onChange={e => set('cuidados_pre', e.target.value)}
                        placeholder="• No usar maquillaje el día del procedimiento&#10;• Evitar alcohol 24h antes…"
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                        style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cuidados posteriores al tratamiento</label>
              <textarea rows={4} value={form.cuidados_post}
                        onChange={e => set('cuidados_post', e.target.value)}
                        placeholder="• No exponerse al sol las primeras 48h&#10;• Aplicar crema hidratante…"
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                        style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo" checked={form.activo}
                     onChange={e => set('activo', e.target.checked)}
                     className="rounded" />
              <label htmlFor="activo" className="text-sm text-gray-600">Activo (requerir firma a pacientes)</label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose}
                      className="px-4 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando…' : 'Guardar consentimiento'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
