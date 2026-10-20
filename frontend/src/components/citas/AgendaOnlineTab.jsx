import { useState, useEffect } from 'react'
import {
  getBandeja, confirmarCita, rechazarCita, registrarAnticipo, marcarDevuelto,
  getTratamientosDeEmpleada, guardarTratamientosDeEmpleada,
} from '../../api/agendaOnline'
import { getEmpleados } from '../../api/empleados'
import { getTratamientos } from '../../api/tratamientos'

const LANDING = 'https://www.gioval.mx'
const fmtFecha = iso => new Date(iso).toLocaleString('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: true,
})
const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX')}`

// Abre WhatsApp con el mensaje listo (recepción solo da "Enviar")
function abrirWhatsApp(telefono, texto) {
  window.open(`https://wa.me/52${telefono}?text=${encodeURIComponent(texto)}`, '_blank')
}

const msgConfirmada = c =>
  `Hola ${c.nombre_paciente.split(' ')[0]}, tu cita en Gioval Medicina Estética está CONFIRMADA ✨\n\n` +
  `📅 ${fmtFecha(c.fecha_hora)}\n💆 ${c.tratamiento_nombre}${c.empleada_nombre ? ` con ${c.empleada_nombre}` : ''}\n\n` +
  `Para reagendar o cancelar: ${LANDING}/mi-cita/${c.token}\n` +
  `Recuerda: puedes reagendar sin costo; si cancelas con menos de 24 h de anticipación el anticipo no es reembolsable.`

const msgRechazada = c =>
  `Hola ${c.nombre_paciente.split(' ')[0]}, lamentamos informarte que no pudimos confirmar tu cita del ${fmtFecha(c.fecha_hora)}. ` +
  `${c.anticipo_estado === 'pagado' ? 'Tu anticipo será devuelto. ' : ''}¿Te ayudamos a buscar otro horario?`

const btn = 'text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50'

function Tarjeta({ c, children }) {
  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-sage)' }}>
      <div className="flex justify-between gap-2">
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--color-dark)' }}>{c.nombre_paciente}</p>
          <p className="text-xs text-gray-500">📱 {c.telefono}{c.email ? ` · ${c.email}` : ''}</p>
        </div>
        <span className={`text-xs h-fit px-2 py-0.5 rounded-full ${
          c.anticipo_estado === 'pagado' ? 'bg-green-100 text-green-800'
          : c.anticipo_estado === 'por_devolver' ? 'bg-red-100 text-red-700'
          : 'bg-yellow-100 text-yellow-800'}`}>
          Anticipo {fmt(c.anticipo)} · {c.anticipo_estado.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm" style={{ color: 'var(--color-dark)' }}>
        <span className="inline-block first-letter:uppercase">{fmtFecha(c.fecha_hora)}</span><br />
        {c.tratamiento_nombre} {c.precio && <span className="text-gray-500">({fmt(c.precio)})</span>}
        {c.empleada_nombre && <span className="text-gray-500"> · con {c.empleada_nombre}</span>}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function AnticipoBotones({ c, accion }) {
  return ['efectivo', 'transferencia', 'tarjeta'].map(f => (
    <button key={f} onClick={() => accion(() => registrarAnticipo(c.id, f))}
            className={`${btn} border`} style={{ borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
      Anticipo en {f}
    </button>
  ))
}

function Bandeja() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [ocupado, setOcupado] = useState(false)

  const cargar = () => getBandeja().then(setRows).finally(() => setLoading(false))
  useEffect(() => { cargar() }, [])

  const accion = async (fn, despues) => {
    setOcupado(true)
    try { await fn(); despues?.(); await cargar() }
    catch (e) { alert(e.response?.data?.error || 'Error') }
    finally { setOcupado(false) }
  }

  const confirmar = c => accion(() => confirmarCita(c.id), () => abrirWhatsApp(c.telefono, msgConfirmada(c)))
  const rechazar = c => {
    if (!confirm(`¿Rechazar la cita de ${c.nombre_paciente}?${c.anticipo_estado === 'pagado' ? ' Se devolverá el anticipo.' : ''}`)) return
    accion(() => rechazarCita(c.id), () => abrirWhatsApp(c.telefono, msgRechazada(c)))
  }

  if (loading) return <p className="text-center py-12 text-[#887482]">Cargando...</p>

  const porConfirmar = rows.filter(r => r.estatus === 'por_confirmar')
  const sinAnticipo  = rows.filter(r => r.estatus === 'pendiente' && r.anticipo_estado === 'pendiente')
  const porDevolver  = rows.filter(r => r.anticipo_estado === 'por_devolver')

  const Seccion = ({ titulo, items, vacio, children }) => (
    <section className="mb-6">
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-dark)' }}>{titulo} ({items.length})</h2>
      {items.length === 0
        ? <p className="text-sm text-gray-400">{vacio}</p>
        : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map(children)}</div>}
    </section>
  )

  return (
    <div className={ocupado ? 'opacity-60 pointer-events-none' : ''}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Reservas hechas desde gioval.mx/agendar</p>
        <button onClick={cargar} className="px-3 py-1 rounded-full text-sm border border-[#ced1ca] text-[#887482]">↺ Actualizar</button>
      </div>

      <Seccion titulo="Por confirmar" items={porConfirmar} vacio="Sin reservas nuevas">
        {c => (
          <Tarjeta key={c.id} c={c}>
            <button onClick={() => confirmar(c)} className={`${btn} text-white`} style={{ backgroundColor: '#16a34a' }}>
              ✓ Confirmar y avisar por WhatsApp
            </button>
            <button onClick={() => rechazar(c)} className={`${btn} border border-red-300 text-red-600`}>Rechazar</button>
            {c.anticipo_estado === 'pendiente' && <AnticipoBotones c={c} accion={accion} />}
          </Tarjeta>
        )}
      </Seccion>

      <Seccion titulo="Confirmadas sin anticipo" items={sinAnticipo} vacio="Todas las confirmadas tienen anticipo">
        {c => <Tarjeta key={c.id} c={c}><AnticipoBotones c={c} accion={accion} /></Tarjeta>}
      </Seccion>

      <Seccion titulo="Anticipos por devolver" items={porDevolver} vacio="Sin devoluciones pendientes">
        {c => (
          <Tarjeta key={c.id} c={c}>
            {['transferencia', 'efectivo'].map(f => (
              <button key={f} onClick={() => accion(() => marcarDevuelto(c.id, f))}
                      className={`${btn} border`} style={{ borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
                Devuelto por {f}
              </button>
            ))}
          </Tarjeta>
        )}
      </Seccion>
    </div>
  )
}

// Qué tratamientos realiza cada especialista → define qué se puede agendar en línea y con quién
function Especialistas() {
  const [empleadas, setEmpleadas] = useState([])
  const [tratamientos, setTratamientos] = useState([])
  const [empId, setEmpId] = useState('')
  const [sel, setSel] = useState(new Set())
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getEmpleados().then(es => setEmpleadas(es.filter(e => e.estatus === 'activo')))
    getTratamientos().then(ts => setTratamientos(ts.filter(t => t.activo)))
  }, [])
  useEffect(() => {
    setMsg('')
    if (empId) getTratamientosDeEmpleada(empId).then(ids => setSel(new Set(ids)))
  }, [empId])

  const categorias = Object.entries(tratamientos.reduce((acc, t) => {
    (acc[t.categoria || 'Sin categoría'] ||= []).push(t); return acc
  }, {})).sort(([a], [b]) => a.localeCompare(b))

  const toggle = ids => setSel(prev => {
    const n = new Set(prev)
    const todos = ids.every(id => n.has(id))
    ids.forEach(id => todos ? n.delete(id) : n.add(id))
    return n
  })

  const guardar = async () => {
    await guardarTratamientosDeEmpleada(empId, [...sel])
    setMsg(`Guardado: ${sel.size} tratamientos`)
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        Marca qué tratamientos realiza cada especialista. Solo lo marcado se puede agendar en línea.
        Las valoraciones (primera cita) deben asignarse a la Dra. Giovanna.
      </p>
      <div className="flex gap-2 items-center mb-4">
        <select value={empId} onChange={e => setEmpId(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-sage)' }}>
          <option value="">Selecciona especialista…</option>
          {empleadas.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido_paterno}</option>)}
        </select>
        {empId && <button onClick={guardar} className={`${btn} text-white`} style={{ backgroundColor: 'var(--color-accent)' }}>Guardar</button>}
        {msg && <span className="text-sm text-green-700">{msg}</span>}
      </div>
      {empId && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categorias.map(([cat, ts]) => {
            const ids = ts.map(t => t.id)
            return (
              <div key={cat} className="bg-white rounded-xl border p-3" style={{ borderColor: 'var(--color-sage)' }}>
                <label className="flex gap-2 items-center font-semibold text-sm mb-2" style={{ color: 'var(--color-dark)' }}>
                  <input type="checkbox" checked={ids.every(id => sel.has(id))} onChange={() => toggle(ids)} />
                  {cat}
                </label>
                {ts.map(t => (
                  <label key={t.id} className="flex gap-2 items-center text-xs text-gray-700 ml-5 py-0.5">
                    <input type="checkbox" checked={sel.has(t.id)} onChange={() => toggle([t.id])} />
                    {t.nombre}
                  </label>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AgendaOnlineTab() {
  const rol = localStorage.getItem('rol')
  const [vista, setVista] = useState('bandeja')
  return (
    <div>
      {rol === 'admin' && (
        <div className="flex gap-2 mb-4">
          {[['bandeja', 'Reservas'], ['especialistas', 'Especialistas por tratamiento']].map(([k, label]) => (
            <button key={k} onClick={() => setVista(k)}
                    className={`px-3 py-1 rounded-full text-sm border ${vista === k ? 'bg-[#aba3ba] text-white border-[#aba3ba]' : 'bg-white text-[#4d4846] border-[#ced1ca]'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {vista === 'bandeja' ? <Bandeja /> : <Especialistas />}
    </div>
  )
}
