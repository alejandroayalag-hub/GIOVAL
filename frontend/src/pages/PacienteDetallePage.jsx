import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaciente } from '../api/pacientes';
import { getHistoria } from '../api/historiasClinicas';
import { getNotasByPaciente } from '../api/notasVisita';
import { getConsentimiento, getFirmadosByPaciente } from '../api/consentimientos';
import HistoriaClinicaForm from '../components/HistoriaClinicaForm';
import NotaVisitaModal from '../components/NotaVisitaModal';
import PacienteFormModal from '../components/PacienteFormModal';
import ConsentimientoFirmaModal from '../components/ConsentimientoFirmaModal';
import logoGioval from '../assets/gioval-logo.png';

const ESTATUS_COLOR = {
  pendiente: '#aba3ba',
  realizada: '#4ade80',
  cancelada: '#f87171',
};

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-[var(--color-accent)]' : 'border-transparent hover:opacity-70'}`}
            style={{ color: active ? 'var(--color-accent)' : 'var(--color-dark)' }}>
      {children}
    </button>
  );
}

export default function PacienteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [historia, setHistoria] = useState(null);
  const [notas, setNotas] = useState([]);
  const [tab, setTab] = useState('historia');
  const [notaModal, setNotaModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consentsFirmados, setConsentsFirmados] = useState([]);
  const [consentModal, setConsentModal] = useState(null);

  async function cargar() {
    setLoading(true);
    try {
      const [p, h, n, cf] = await Promise.all([
        getPaciente(id),
        getHistoria(id),
        getNotasByPaciente(id),
        getFirmadosByPaciente(id),
      ]);
      setPaciente(p);
      setHistoria(h);
      setNotas(n);
      setConsentsFirmados(cf);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [id]);

  if (loading) return <p className="text-sm text-gray-500 mt-8">Cargando expediente…</p>;
  if (!paciente) return <p className="text-sm text-red-500 mt-8">Paciente no encontrado.</p>;

  function nombreCompleto() {
    return [paciente.apellido_paterno, paciente.apellido_materno, paciente.nombre].filter(Boolean).join(' ');
  }

  const citasSinNota = (paciente.citas || []).filter(c =>
    c.estatus === 'realizada' && !notas.some(n => n.cita_id === c.id)
  );

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/pacientes')}
                className="text-sm" style={{ color: 'var(--color-accent)' }}>
          ← Pacientes
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6 flex items-start justify-between"
           style={{ borderColor: 'var(--color-sage)' }}>
        <div className="flex items-center gap-4">
          <img src={logoGioval} alt="gioval" className="h-10 object-contain"
               style={{ filter: 'brightness(0.4) sepia(1) saturate(0.5)' }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>{nombreCompleto()}</h1>
            <p className="text-sm text-gray-500">
              {paciente.telefono || ''}{paciente.edad ? ` · ${paciente.edad} años` : ''}
              {paciente.sexo ? ` · ${paciente.sexo}` : ''}
              {paciente.ocupacion ? ` · ${paciente.ocupacion}` : ''}
            </p>
          </div>
        </div>
        <button onClick={() => setEditModal(true)}
                className="text-sm border rounded-lg px-3 py-1"
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-dark)' }}>
          Editar datos
        </button>
      </div>

      <div className="border-b mb-6 flex gap-1" style={{ borderColor: 'var(--color-sage)' }}>
        <TabBtn active={tab === 'historia'} onClick={() => setTab('historia')}>Historia Clínica</TabBtn>
        <TabBtn active={tab === 'citas'} onClick={() => setTab('citas')}>
          Citas {paciente.citas?.length ? `(${paciente.citas.length})` : ''}
        </TabBtn>
        <TabBtn active={tab === 'notas'} onClick={() => setTab('notas')}>
          Notas de Visita {notas.length ? `(${notas.length})` : ''}
        </TabBtn>
        <TabBtn active={tab === 'consentimientos'} onClick={() => setTab('consentimientos')}>
          Consentimientos {consentsFirmados.length ? `(${consentsFirmados.length})` : ''}
        </TabBtn>
      </div>

      {tab === 'historia' && (
        historia
          ? <HistoriaClinicaForm pacienteId={id} historia={historia} onSaved={setHistoria} />
          : <p className="text-sm text-gray-400 mt-4">No se encontró la historia clínica. Recarga la página o contacta al administrador.</p>
      )}

      {tab === 'citas' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
             style={{ borderColor: 'var(--color-sage)' }}>
          {!paciente.citas?.length ? (
            <p className="p-6 text-sm text-gray-400">Sin citas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                  {['Fecha y hora','Tratamiento','Empleada','Estatus'].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paciente.citas.map(c => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                    <td className="px-4 py-3">
                      {new Date(c.fecha_hora).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">{c.tratamiento_nombre || '—'}</td>
                    <td className="px-4 py-3">{c.empleada_nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs text-white"
                            style={{ backgroundColor: ESTATUS_COLOR[c.estatus] || '#ccc' }}>
                        {c.estatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'notas' && (
        <div>
          {citasSinNota.length > 0 && (
            <div className="mb-4">
              <button onClick={() => setNotaModal({ cita: citasSinNota[0], nota: null })}
                      className="px-4 py-2 text-sm text-white rounded-lg"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                + Nueva nota de visita
              </button>
            </div>
          )}
          {notas.length === 0 ? (
            <p className="text-sm text-gray-400">Sin notas de visita registradas.</p>
          ) : (
            <div className="space-y-3">
              {notas.map(n => (
                <div key={n.id}
                     className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-shadow"
                     style={{ borderColor: 'var(--color-sage)' }}
                     onClick={() => {
                       const cita = paciente.citas?.find(c => c.id === n.cita_id) || { id: n.cita_id, fecha_hora: n.fecha_hora };
                       setNotaModal({ cita, nota: n });
                     }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                        {new Date(n.created_at).toLocaleDateString('es-MX', { dateStyle: 'long' })}
                      </p>
                      <p className="text-xs text-gray-500">{n.tratamiento_nombre || ''} · {n.creado_por_nombre || ''}</p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>Editar →</span>
                  </div>
                  {n.evolucion && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{n.evolucion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'consentimientos' && (
        <div>
          {(() => {
            const citasPendientes = (paciente.citas || []).filter(c => c.estatus === 'pendiente');
            const citasSinConsent = citasPendientes.filter(c =>
              !consentsFirmados.some(cf => cf.cita_id === c.id)
            );
            if (!citasSinConsent.length) return null;
            return (
              <div className="mb-4 p-4 rounded-xl border" style={{ borderColor: 'var(--color-sage)', backgroundColor: 'var(--color-cream)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-dark)' }}>
                  Firmar antes del procedimiento:
                </p>
                <div className="flex flex-wrap gap-2">
                  {citasSinConsent.map(c => (
                    <button key={c.id}
                            onClick={async () => {
                              if (!c.tratamiento_id) return;
                              try {
                                const consent = await getConsentimiento(c.tratamiento_id);
                                if (consent?.id) setConsentModal({ consentimiento: consent, cita: c });
                              } catch {}
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg text-white"
                            style={{ backgroundColor: 'var(--color-accent)' }}>
                      Firmar — {c.tratamiento_nombre || 'Cita'} · {new Date(c.fecha_hora).toLocaleDateString('es-MX')}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {consentsFirmados.length === 0 ? (
            <p className="text-sm text-gray-400">Sin consentimientos firmados.</p>
          ) : (
            <div className="space-y-3">
              {consentsFirmados.map(cf => (
                <div key={cf.id} className="bg-white rounded-xl border p-4"
                     style={{ borderColor: 'var(--color-sage)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                        {cf.titulo || cf.tratamiento_nombre || 'Consentimiento'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Firmado el {new Date(cf.fecha_firmado).toLocaleDateString('es-MX', { dateStyle: 'long' })}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Firmado</span>
                  </div>
                  <div className="mt-3 border rounded-lg p-2 inline-block" style={{ borderColor: 'var(--color-sage)' }}>
                    <img src={cf.firma_imagen} alt="firma" className="h-12 object-contain" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {notaModal && (
        <NotaVisitaModal
          cita={notaModal.cita}
          pacienteId={parseInt(id)}
          nota={notaModal.nota}
          onClose={() => setNotaModal(null)}
          onSaved={() => { setNotaModal(null); cargar(); }}
        />
      )}

      {editModal && (
        <PacienteFormModal
          paciente={paciente}
          onClose={() => setEditModal(false)}
          onSaved={() => { setEditModal(false); cargar(); }}
        />
      )}

      {consentModal && (
        <ConsentimientoFirmaModal
          consentimiento={consentModal.consentimiento}
          paciente={paciente}
          cita={consentModal.cita}
          onClose={() => setConsentModal(null)}
          onFirmado={() => { setConsentModal(null); cargar(); }}
        />
      )}
    </div>
  );
}
