import { useRef, useState } from 'react';
import SignaturePad from './SignaturePad';
import { firmarConsentimiento } from '../api/consentimientos';

function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function expId(id) {
  return String(id || 0).padStart(6, '0');
}

export default function ConsentimientoFirmaModal({ consentimiento, paciente, cita, onClose, onFirmado }) {
  const sigRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autorizaFotos, setAutorizaFotos] = useState(null);
  const requiereFotos = consentimiento.codigo === 'CI-01';

  const nombreCompleto = [paciente.apellido_paterno, paciente.apellido_materno, paciente.nombre]
    .filter(Boolean).join(' ');

  const domicilio = [paciente.direccion, paciente.colonia].filter(Boolean).join(', ');
  const ciudadEstado = [paciente.ciudad, paciente.estado].filter(Boolean).join(', ');
  const edad = calcEdad(paciente.fecha_nacimiento);
  const procedimiento = cita?.tratamiento_nombre || '';

  async function handleFirmar() {
    if (requiereFotos && autorizaFotos === null) {
      setError('Selecciona una opción de autorización de fotografías.');
      return;
    }
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
        tratamiento_nombre: procedimiento || consentimiento.titulo || '',
        firma_imagen,
        autoriza_fotos: requiereFotos ? autorizaFotos : null,
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
            {procedimiento && procedimiento !== consentimiento.titulo && (
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-accent)' }}>
                Procedimiento: {procedimiento}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Datos del paciente (encabezado pre-llenado) */}
          <div className="rounded-xl border p-4 text-xs" style={{ borderColor: 'var(--color-sage)', backgroundColor: 'var(--color-cream)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
              Datos del paciente
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              <div><span className="text-gray-400">Nombre completo:</span> <span className="font-medium" style={{ color: 'var(--color-dark)' }}>{nombreCompleto}</span></div>
              <div><span className="text-gray-400">No. Expediente:</span> <span className="font-medium" style={{ color: 'var(--color-dark)' }}>GVL-{expId(paciente.id)}</span></div>
              <div>
                <span className="text-gray-400">Fecha de nacimiento:</span>{' '}
                <span className="font-medium" style={{ color: 'var(--color-dark)' }}>
                  {fmtFecha(paciente.fecha_nacimiento)}{edad !== null ? ` (${edad} años)` : ''}
                </span>
              </div>
              <div><span className="text-gray-400">Teléfono:</span> <span className="font-medium" style={{ color: 'var(--color-dark)' }}>{paciente.telefono || '—'}</span></div>
              {paciente.email && (
                <div className="col-span-2"><span className="text-gray-400">Correo:</span> <span className="font-medium" style={{ color: 'var(--color-dark)' }}>{paciente.email}</span></div>
              )}
              {domicilio && (
                <div className="col-span-2"><span className="text-gray-400">Domicilio:</span> <span className="font-medium" style={{ color: 'var(--color-dark)' }}>{domicilio}{ciudadEstado ? `, ${ciudadEstado}` : ''}</span></div>
              )}
              <div className="col-span-2 mt-1 pt-1 border-t" style={{ borderColor: 'var(--color-sage)' }}>
                <span className="text-gray-400">Médico tratante:</span>{' '}
                <span className="font-medium" style={{ color: 'var(--color-dark)' }}>
                  Dra. Itzel Giovanna Valencia López · Medicina Estética
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Fecha:</span>{' '}
                <span className="font-medium" style={{ color: 'var(--color-dark)' }}>
                  {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}
                </span>
              </div>
            </div>
          </div>

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
                Indicaciones previas al procedimiento
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
                Cuidados posteriores al procedimiento
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {consentimiento.cuidados_post}
              </p>
            </div>
          )}

          {requiereFotos && (
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-sage)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                Autorización de fotografía clínica
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="autorizaFotos" checked={autorizaFotos === true}
                         onChange={() => setAutorizaFotos(true)} />
                  Autorizo el uso de mis fotografías clínicas para fines académicos y/o difusión en redes sociales
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="autorizaFotos" checked={autorizaFotos === false}
                         onChange={() => setAutorizaFotos(false)} />
                  NO autorizo
                </label>
              </div>
            </div>
          )}

          {/* Declaración + Firma */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--color-sage)' }}>
            <p className="text-sm text-gray-600 mb-1">
              Yo, <strong>{nombreCompleto}</strong>, declaro haber leído y comprendido el presente consentimiento
              informado. Acepto de forma voluntaria el procedimiento indicado.
            </p>
            <p className="text-xs text-gray-400 mb-3">
              {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}
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
