import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes } from '../api/pacientes';
import PacienteFormModal from '../components/PacienteFormModal';

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const cargar = () => {
    setLoading(true);
    getPacientes().then(setPacientes).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = pacientes.filter(p => {
    const q = busqueda.toLowerCase();
    return (
      p.apellido_paterno?.toLowerCase().includes(q) ||
      p.apellido_materno?.toLowerCase().includes(q) ||
      p.nombre?.toLowerCase().includes(q) ||
      p.telefono?.includes(q)
    );
  });

  function nombreCompleto(p) {
    return [p.apellido_paterno, p.apellido_materno, p.nombre].filter(Boolean).join(' ');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>Pacientes</h1>
        <button onClick={() => setModal(true)}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: 'var(--color-accent)' }}>
          + Nueva paciente
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Buscar por nombre o teléfono…"
               value={busqueda} onChange={e => setBusqueda(e.target.value)}
               className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm"
               style={{ borderColor: 'var(--color-primary)' }} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
             style={{ borderColor: 'var(--color-sage)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                {['Nombre completo', 'Teléfono', 'Registro', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: 'var(--color-dark)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
              ) : filtrados.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50 cursor-pointer"
                    style={{ borderColor: 'var(--color-sage)' }}
                    onClick={() => navigate(`/pacientes/${p.id}`)}>
                  <td className="px-4 py-3 font-medium">{nombreCompleto(p)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.telefono || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.fecha_registro ? new Date(p.fecha_registro).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>Ver expediente →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <PacienteFormModal
          onClose={() => setModal(false)}
          onSaved={(saved) => navigate(`/pacientes/${saved.id}`, { state: { tab: 'consentimientos' } })}
        />
      )}
    </div>
  );
}
