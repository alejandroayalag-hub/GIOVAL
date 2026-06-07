import { useRef, useState } from 'react';
import SignaturePad from './SignaturePad';
import { firmarConsentimiento } from '../api/consentimientos';

export default function ConsentimientoFirmaModal({ consentimiento, paciente, cita, onClose, onFirmado }) {
  const sigRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nombreCompleto = [paciente.apellido_paterno, paciente.apellido_materno, paciente.nombre]
    .filter(Boolean).join(' ');

  async function handleFirmar() {
    if (sigRef.current?.isEmpty()) {
      setError('Por favor dibuje la firma antes de continuar.');
      return;
    }
    setLoading(true); setError('');
    try {
      const firma_imagen = sigRef.current.toDataURL();
      await firmarConsentimiento({
        consentimiento_id: consentimiento.id,
        paciente_id: paciente.id,
        cita_id: cita?.id || null,
        nombre_paciente: nombreCompleto,
        tratamiento_nombre: consentimiento.titulo || '',
        firma_imagen,
      });
      onFirmado?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la firma');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col"
           style={{ borderTop: '4px solid var(--color-accent)' }}>

        {/* Header */}
        <div className="p-5 border-b flex justify-between items-start flex-shrink-0"
             style={{ borderColor: 'var(--color-sage)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--color-dark)' }}>
              {consentimiento.titulo || 'Consentimiento Informado'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{nombreCompleto}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Texto del consentimiento */}
          {consentimiento.texto_consentimiento && (
            <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: 'var(--color-sage)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                Consentimiento
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {consentimiento.texto_consentimiento}
              </p>
            </div>
          )}

          {/* Cuidados previos */}
          {consentimiento.cuidados_pre && (
            <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--color-sage)', backgroundColor: 'var(--color-cream)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                Cuidados previos
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {consentimiento.cuidados_pre}
              </p>
            </div>
          )}

          {/* Cuidados posteriores */}
          {consentimiento.cuidados_post && (
            <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--color-sage)', backgroundColor: 'var(--color-cream)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                Cuidados posteriores
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {consentimiento.cuidados_post}
              </p>
            </div>
          )}

          {/* Declaración + Firma */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--color-sage)' }}>
            <p className="text-sm text-gray-600 mb-1">
              He leído y entendido el presente consentimiento. Acepto el procedimiento de forma voluntaria.
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Paciente: <strong>{nombreCompleto}</strong> · {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}
            </p>

            <SignaturePad ref={sigRef} height={180} />

            <div className="flex justify-end mt-2">
              <button type="button"
                      onClick={() => sigRef.current?.clear()}
                      className="text-xs text-gray-400 hover:text-gray-600">
                Limpiar firma
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0"
             style={{ borderColor: 'var(--color-sage)' }}>
          <button onClick={onClose}
                  className="px-4 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-primary)' }}>
            Cancelar
          </button>
          <button onClick={handleFirmar} disabled={loading}
                  className="px-5 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-medium"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
            {loading ? 'Guardando…' : 'Confirmar y firmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
