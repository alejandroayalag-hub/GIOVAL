import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPaciente, uploadFotoPaciente } from '../api/pacientes';
import { getFotosByCita, uploadFotoCita, deleteFotoCita, fotoUrl } from '../api/fotosCita';
import { getHistoria } from '../api/historiasClinicas';
import { getNotasByPaciente } from '../api/notasVisita';
import { getConsentimiento, getConsentimientoGeneral, getFirmadosByPaciente } from '../api/consentimientos';
import HistoriaClinicaForm from '../components/HistoriaClinicaForm';
import NotaVisitaModal from '../components/NotaVisitaModal';
import PacienteFormModal from '../components/PacienteFormModal';
import ConsentimientoFirmaModal from '../components/ConsentimientoFirmaModal';
import DocumentosClinicosTab from '../components/DocumentosClinicosTab';
import { DiagnosticosTab, RecetasTab, NotasMedicasTab, ArchivosTab } from '../components/ExpedienteTabs';
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
  const location = useLocation();
  const rol = localStorage.getItem('rol');
  const [paciente, setPaciente] = useState(null);
  const [historia, setHistoria] = useState(null);
  const [notas, setNotas] = useState([]);
  const [tab, setTab] = useState(location.state?.tab || 'historia');
  const [notaModal, setNotaModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consentsFirmados, setConsentsFirmados] = useState([]);
  const [consentModal, setConsentModal] = useState(null);
  const [citaFotosOpen, setCitaFotosOpen] = useState({});
  const [fotosByCita, setFotosByCita] = useState({});
  const [lightbox, setLightbox] = useState(null);

  async function cargar(soloMeta = false) {
    if (!soloMeta) setLoading(true);
    try {
      if (soloMeta) {
        // Recarga ligera: solo paciente, notas y consentimientos — NO toca historia para no pisar cambios no guardados
        const [p, n, cf] = await Promise.all([
          getPaciente(id),
          getNotasByPaciente(id),
          getFirmadosByPaciente(id),
        ]);
        setPaciente(p);
        setNotas(n);
        setConsentsFirmados(cf);
      } else {
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
      }
    } catch (err) {
      console.error(err);
    } finally { if (!soloMeta) setLoading(false); }
  }

  async function cargarFotosCita(citaId) {
    if (fotosByCita[citaId]) return;
    try {
      const data = await getFotosByCita(citaId);
      setFotosByCita(prev => ({ ...prev, [citaId]: data }));
    } catch (e) {
      console.error('Error cargando fotos cita', e);
    }
  }

  function toggleFotosCita(citaId) {
    const abriendo = !citaFotosOpen[citaId];
    setCitaFotosOpen(prev => ({ ...prev, [citaId]: abriendo }));
    if (abriendo) cargarFotosCita(citaId);
  }

  async function handleUploadFoto(citaId, etapa, file) {
    try {
      const fd = new FormData();
      fd.append('cita_id', citaId);
      fd.append('paciente_id', id);
      fd.append('etapa', etapa);
      fd.append('archivo', file);
      const nueva = await uploadFotoCita(fd);
      setFotosByCita(prev => {
        const grupo = prev[citaId] || { antes: [], durante: [], despues: [] };
        return {
          ...prev,
          [citaId]: { ...grupo, [etapa]: [...(grupo[etapa] || []), nueva] },
        };
      });
    } catch (e) {
      alert(e.response?.data?.error || 'Error al subir foto');
    }
  }

  async function handleDeleteFoto(citaId, etapa, fotoId) {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await deleteFotoCita(fotoId);
      setFotosByCita(prev => {
        const grupo = prev[citaId] || { antes: [], durante: [], despues: [] };
        return {
          ...prev,
          [citaId]: { ...grupo, [etapa]: grupo[etapa].filter(f => f.id !== fotoId) },
        };
      });
    } catch (e) {
      alert('Error al eliminar foto');
    }
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
          {/* Foto de paciente */}
          <label className="relative cursor-pointer flex-shrink-0 group">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-100"
                 style={{ borderColor: 'var(--color-sage)' }}>
              {paciente.foto
                ? <img src={`${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:3008'}/${paciente.foto}`}
                       alt="foto" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                    {paciente.apellido_paterno?.[0]}{paciente.nombre?.[0]}
                  </span>
              }
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-white text-xs">Foto</span>
            </div>
            <input type="file" accept="image/*" className="hidden"
                   onChange={async e => {
                     const file = e.target.files?.[0];
                     if (!file) return;
                     try {
                       const updated = await uploadFotoPaciente(paciente.id, file);
                       setPaciente(p => ({ ...p, foto: updated.foto }));
                     } catch { alert('Error al subir foto'); }
                   }} />
          </label>

          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>{nombreCompleto()}</h1>
            <p className="text-sm text-gray-500">
              {paciente.telefono || ''}{paciente.edad ? ` · ${paciente.edad} años` : ''}
              {paciente.sexo ? ` · ${paciente.sexo}` : ''}
              {paciente.ocupacion ? ` · ${paciente.ocupacion}` : ''}
            </p>
            {(paciente.ciudad || paciente.colonia) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[paciente.colonia, paciente.ciudad, paciente.codigo_postal].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        {(rol === 'admin' || rol === 'asistente_general') && (
          <button onClick={() => setEditModal(true)}
                  className="text-sm border rounded-lg px-3 py-1"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-dark)' }}>
            Editar datos
          </button>
        )}
      </div>

      <div className="border-b mb-6 flex gap-1 overflow-x-auto whitespace-nowrap" style={{ borderColor: 'var(--color-sage)' }}>
        <TabBtn active={tab === 'historia'} onClick={() => setTab('historia')}>Historia Clínica</TabBtn>
        <TabBtn active={tab === 'citas'} onClick={() => setTab('citas')}>
          Citas {paciente.citas?.length ? `(${paciente.citas.length})` : ''}
        </TabBtn>
        {rol !== 'asistente_general' && (
          <TabBtn active={tab === 'notas'} onClick={() => setTab('notas')}>
            Notas de Visita {notas.length ? `(${notas.length})` : ''}
          </TabBtn>
        )}
        {(rol === 'admin' || rol === 'asistente_medico') && (
          <TabBtn active={tab === 'consentimientos'} onClick={() => setTab('consentimientos')}>
            Consentimientos {consentsFirmados.length ? `(${consentsFirmados.length})` : ''}
          </TabBtn>
        )}
        {(rol === 'admin' || rol === 'asistente_medico') && (
          <TabBtn active={tab === 'documentos'} onClick={() => setTab('documentos')}>
            Valoraciones y Procedimientos
          </TabBtn>
        )}
        {(rol === 'admin' || rol === 'asistente_medico') && (
          <TabBtn active={tab === 'diagnosticos'} onClick={() => setTab('diagnosticos')}>
            Diagnósticos
          </TabBtn>
        )}
        {(rol === 'admin' || rol === 'asistente_medico') && (
          <TabBtn active={tab === 'recetas'} onClick={() => setTab('recetas')}>
            Recetas
          </TabBtn>
        )}
        {(rol === 'admin' || rol === 'asistente_medico') && (
          <TabBtn active={tab === 'notas-medicas'} onClick={() => setTab('notas-medicas')}>
            Notas Médicas
          </TabBtn>
        )}
        {(rol === 'admin' || rol === 'asistente_medico' || rol === 'asistente_general') && (
          <TabBtn active={tab === 'archivos'} onClick={() => setTab('archivos')}>
            Archivos
          </TabBtn>
        )}
      </div>

      {/* HC siempre montada para no perder cambios no guardados al cambiar de pestaña */}
      <div style={{ display: tab === 'historia' ? 'block' : 'none' }}>
        {historia
          ? <HistoriaClinicaForm pacienteId={id} historia={historia} onSaved={setHistoria} editableSections={rol === 'asistente_medico' ? [6, 8] : null} />
          : <p className="text-sm text-gray-400 mt-4">No se encontró la historia clínica. Recarga la página o contacta al administrador.</p>
        }
      </div>

      {tab === 'citas' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
             style={{ borderColor: 'var(--color-sage)' }}>
          {!paciente.citas?.length ? (
            <p className="p-6 text-sm text-gray-400">Sin citas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                  {['Fecha y hora','Tratamiento','Empleada','Estatus', ...(rol === 'admin' || rol === 'asistente_medico' ? ['Fotos'] : [])].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paciente.citas.map(c => {
                  const fotosAbiertas = citaFotosOpen[c.id];
                  const fotosData = fotosByCita[c.id];
                  const totalFotos = fotosData
                    ? (fotosData.antes.length + fotosData.durante.length + fotosData.despues.length)
                    : 0;
                  return (
                    <React.Fragment key={c.id}>
                      <tr className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
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
                        {(rol === 'admin' || rol === 'asistente_medico') && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleFotosCita(c.id)}
                              className="text-xs px-2 py-1 rounded border transition-colors"
                              style={{
                                borderColor: 'var(--color-accent)',
                                color: fotosAbiertas ? 'white' : 'var(--color-accent)',
                                backgroundColor: fotosAbiertas ? 'var(--color-accent)' : 'transparent',
                              }}
                            >
                              📷 {totalFotos > 0 ? `Fotos (${totalFotos})` : 'Fotos'}
                            </button>
                          </td>
                        )}
                      </tr>
                      {fotosAbiertas && (rol === 'admin' || rol === 'asistente_medico') && (
                        <tr className="border-t" style={{ borderColor: 'var(--color-sage)', backgroundColor: '#faf9fb' }}>
                          <td colSpan={5} className="px-4 py-4">
                            {!fotosData ? (
                              <p className="text-xs text-gray-400">Cargando fotos…</p>
                            ) : (
                              <div className="grid grid-cols-3 gap-4">
                                {['antes', 'durante', 'despues'].map(etapa => (
                                  <div key={etapa}>
                                    <p className="text-xs font-semibold mb-2 capitalize"
                                       style={{ color: 'var(--color-accent)' }}>
                                      {etapa === 'despues' ? 'Después' : etapa.charAt(0).toUpperCase() + etapa.slice(1)}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {(fotosData[etapa] || []).map(foto => (
                                        <div key={foto.id} className="relative group w-16 h-16 rounded overflow-hidden border"
                                             style={{ borderColor: 'var(--color-sage)' }}>
                                          <img
                                            src={fotoUrl(foto.archivo)}
                                            alt={etapa}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => setLightbox(fotoUrl(foto.archivo))}
                                          />
                                          {rol === 'admin' && (
                                            <button
                                              onClick={() => handleDeleteFoto(c.id, etapa, foto.id)}
                                              className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <label className="w-16 h-16 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:opacity-70"
                                             style={{ borderColor: 'var(--color-accent)' }}>
                                        <span className="text-xl" style={{ color: 'var(--color-accent)' }}>+</span>
                                        <input type="file" accept="image/*" className="hidden"
                                               onChange={e => {
                                                 const file = e.target.files?.[0];
                                                 if (file) handleUploadFoto(c.id, etapa, file);
                                                 e.target.value = '';
                                               }} />
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
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
            const titulos = { 'CI-00': 'Aviso de Privacidad', 'CI-01': 'Carta Compromiso del Paciente' };
            const generalesFaltantes = ['CI-00', 'CI-01'].filter(
              cod => !consentsFirmados.some(cf => cf.codigo === cod)
            );
            if (!generalesFaltantes.length) return null;
            const codigo = generalesFaltantes[0];
            return (
              <div className="mb-4 p-4 rounded-xl border-2" style={{ borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-cream)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-dark)' }}>
                  {titulos[codigo]} pendiente{generalesFaltantes.length > 1 ? ` (y ${generalesFaltantes.length - 1} más)` : ''}
                </p>
                <button
                  onClick={async () => {
                    try {
                      const consent = await getConsentimientoGeneral(codigo);
                      if (consent?.id) setConsentModal({ consentimiento: consent, cita: null });
                    } catch {}
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
                  Firmar ahora
                </button>
              </div>
            );
          })()}

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

      {tab === 'documentos' && (
        <DocumentosClinicosTab pacienteId={parseInt(id)} />
      )}

      {tab === 'diagnosticos' && (
        <DiagnosticosTab pacienteId={parseInt(id)} rol={rol} />
      )}

      {tab === 'recetas' && (
        <RecetasTab pacienteId={parseInt(id)} paciente={paciente} rol={rol} />
      )}

      {tab === 'notas-medicas' && (
        <NotasMedicasTab pacienteId={parseInt(id)} rol={rol} />
      )}

      {tab === 'archivos' && (
        <ArchivosTab pacienteId={parseInt(id)} rol={rol} />
      )}

      {notaModal && (
        <NotaVisitaModal
          cita={notaModal.cita}
          pacienteId={parseInt(id)}
          nota={notaModal.nota}
          onClose={() => setNotaModal(null)}
          onSaved={() => { setNotaModal(null); cargar(true); }}
        />
      )}

      {editModal && (
        <PacienteFormModal
          paciente={paciente}
          onClose={() => setEditModal(false)}
          onSaved={() => { setEditModal(false); cargar(true); }}
        />
      )}

      {consentModal && (
        <ConsentimientoFirmaModal
          consentimiento={consentModal.consentimiento}
          paciente={paciente}
          cita={consentModal.cita}
          onClose={() => setConsentModal(null)}
          onFirmado={() => { setConsentModal(null); cargar(true); }}
        />
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
             onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="foto ampliada"
               className="max-w-full max-h-full rounded-lg shadow-2xl"
               onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)}
                  className="absolute top-4 right-4 text-white text-2xl bg-black/50 rounded-full w-8 h-8 flex items-center justify-center">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
