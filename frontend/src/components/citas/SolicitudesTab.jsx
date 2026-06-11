import { useState, useEffect } from 'react'
import { getSolicitudes, actualizarEstado } from '../../api/solicitudes'

const ESTADOS = ['pendiente', 'contactada', 'convertida', 'cancelada']
const ESTADO_COLORS = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  contactada: 'bg-blue-100 text-blue-800',
  convertida: 'bg-green-100 text-green-800',
  cancelada: 'bg-gray-100 text-gray-500',
}

export default function SolicitudesTab() {
  const [filtro, setFiltro] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    setLoading(true)
    try {
      const data = await getSolicitudes(filtro)
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [filtro])

  const cambiarEstado = async (id, estado) => {
    await actualizarEstado(id, estado)
    setRows(prev => prev.map(r => r.id === id ? { ...r, estado } : r))
  }

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-MX') : '—'

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ label: 'Todas', value: '' }, ...ESTADOS.map(e => ({ label: e.charAt(0).toUpperCase() + e.slice(1), value: e }))].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFiltro(value)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              filtro === value
                ? 'bg-[#aba3ba] text-white border-[#aba3ba]'
                : 'bg-white text-[#4d4846] border-[#ced1ca] hover:border-[#aba3ba]'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={cargar}
          className="ml-auto px-3 py-1 rounded-full text-sm border border-[#ced1ca] text-[#887482] hover:border-[#aba3ba] transition-colors"
        >
          ↺ Actualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#887482]">Cargando solicitudes...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-[#887482]">
          <p className="text-lg">Sin solicitudes {filtro ? `con estado "${filtro}"` : ''}</p>
          <p className="text-sm mt-1">Las solicitudes de la landing page aparecerán aquí</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#ced1ca]">
          <table className="w-full text-sm">
            <thead className="bg-[#f5f2f0]">
              <tr>
                {['Nombre', 'Teléfono', 'Email', 'Servicio', 'Fecha pref.', 'Notas', 'Recibida', 'Estado'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[#887482] font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f0]/40'}>
                  <td className="px-3 py-2 font-medium text-[#4d4846] whitespace-nowrap">{r.nombre} {r.apellido}</td>
                  <td className="px-3 py-2 text-[#4d4846]">{r.telefono}</td>
                  <td className="px-3 py-2 text-[#4d4846]">{r.email || '—'}</td>
                  <td className="px-3 py-2 text-[#4d4846] max-w-[160px] truncate" title={r.servicio}>{r.servicio || '—'}</td>
                  <td className="px-3 py-2 text-[#4d4846] whitespace-nowrap">{fmt(r.fecha_preferida)}</td>
                  <td className="px-3 py-2 text-[#4d4846] max-w-[120px] truncate" title={r.notas}>{r.notas || '—'}</td>
                  <td className="px-3 py-2 text-[#887482] whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={r.estado}
                      onChange={e => cambiarEstado(r.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${ESTADO_COLORS[r.estado]}`}
                    >
                      {ESTADOS.map(e => (
                        <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
