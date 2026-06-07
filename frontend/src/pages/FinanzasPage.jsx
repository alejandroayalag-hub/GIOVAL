// frontend/src/pages/FinanzasPage.jsx
import { useState, useEffect } from 'react';
import { DollarSign, List, Scale, BarChart2, Tag, Pencil, Trash2 } from 'lucide-react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria,
         getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento } from '../api/finanzas';
import MovimientoModal from '../components/finanzas/MovimientoModal';
import CategoriaModal  from '../components/finanzas/CategoriaModal';
import CorteResumen    from '../components/finanzas/CorteResumen';
import ReportesFinanzas from '../components/finanzas/ReportesFinanzas';

const TABS = [
  { id: 'movimientos', label: 'Movimientos', Icon: List },
  { id: 'corte',       label: 'Corte de Caja', Icon: Scale },
  { id: 'reportes',    label: 'Reportes', Icon: BarChart2 },
  { id: 'categorias',  label: 'Categorías', Icon: Tag, soloAdmin: true },
];

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const FORMA_PAGO_LABELS = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', otro: 'Otro' };

export default function FinanzasPage() {
  const rol = localStorage.getItem('rol');
  const [tab, setTab]           = useState('movimientos');
  const [categorias, setCategorias] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [filtros, setFiltros]   = useState({ tipo: '', categoria_id: '', forma_pago: '', fecha_inicio: '', fecha_fin: '' });
  const [loading, setLoading]   = useState(false);

  // Modales
  const [movModal, setMovModal]         = useState(null); // { tipo: 'ingreso'|'egreso', movimiento?: obj }
  const [catModal, setCatModal]         = useState(null); // { categoria?: obj }
  const [deletingMov, setDeletingMov]   = useState(null);

  const cargarCategorias = () => getCategorias().then(setCategorias).catch(console.error);
  const cargarMovimientos = () => {
    setLoading(true);
    const params = {};
    if (filtros.tipo)         params.tipo = filtros.tipo;
    if (filtros.categoria_id) params.categoria_id = filtros.categoria_id;
    if (filtros.forma_pago)   params.forma_pago = filtros.forma_pago;
    if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
    if (filtros.fecha_fin)    params.fecha_fin = filtros.fecha_fin;
    getMovimientos(params).then(setMovimientos).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { cargarCategorias(); }, []);
  useEffect(() => { if (tab === 'movimientos') cargarMovimientos(); }, [tab]);

  // ── Handlers movimientos ────────────────────────────────────────────────────
  async function handleSaveMovimiento(data) {
    if (movModal.movimiento) await updateMovimiento(movModal.movimiento.id, data);
    else await createMovimiento(data);
    cargarMovimientos();
  }

  async function handleDeleteMovimiento(id) {
    await deleteMovimiento(id);
    setDeletingMov(null);
    cargarMovimientos();
  }

  // ── Handlers categorías ─────────────────────────────────────────────────────
  async function handleSaveCategoria(data) {
    if (catModal.categoria) await updateCategoria(catModal.categoria.id, data);
    else await createCategoria(data);
    cargarCategorias();
  }

  async function handleToggleCategoria(cat) {
    await updateCategoria(cat.id, { activo: !cat.activo });
    cargarCategorias();
  }

  async function handleDeleteCategoria(id) {
    await deleteCategoria(id);
    cargarCategorias();
  }

  const tabsVisibles = TABS.filter(t => !t.soloAdmin || rol === 'admin');

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, #6a5462, #887482)' }}>
          <DollarSign className="w-5 h-5 text-white" strokeWidth={1.6} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>Finanzas</h1>
          <p className="text-xs" style={{ color: 'var(--color-accent)' }}>Ingresos · Egresos · Cortes de caja</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--color-sage)' }}>
        {tabsVisibles.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                  style={{
                    borderColor: tab === id ? 'var(--color-accent)' : 'transparent',
                    color: tab === id ? 'var(--color-dark)' : 'var(--color-accent)',
                  }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Movimientos ─────────────────────────────────────────────────── */}
      {tab === 'movimientos' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-end">
            <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-sage)' }}>
              <option value="">Tipo: todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>

            <select value={filtros.categoria_id} onChange={e => setFiltros(f => ({ ...f, categoria_id: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-sage)' }}>
              <option value="">Categoría: todas</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <select value={filtros.forma_pago} onChange={e => setFiltros(f => ({ ...f, forma_pago: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-sage)' }}>
              <option value="">Forma de pago: todas</option>
              {Object.entries(FORMA_PAGO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <input type="date" value={filtros.fecha_inicio}
                   onChange={e => setFiltros(f => ({ ...f, fecha_inicio: e.target.value }))}
                   className="border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-sage)' }} />
            <input type="date" value={filtros.fecha_fin}
                   onChange={e => setFiltros(f => ({ ...f, fecha_fin: e.target.value }))}
                   className="border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-sage)' }} />

            <button onClick={cargarMovimientos}
                    className="px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
              Filtrar
            </button>

            <div className="ml-auto flex gap-2">
              <button onClick={() => setMovModal({ tipo: 'ingreso' })}
                      className="px-4 py-2 text-sm text-white rounded-lg font-medium"
                      style={{ backgroundColor: '#4a7c6a' }}>
                + Ingreso
              </button>
              <button onClick={() => setMovModal({ tipo: 'egreso' })}
                      className="px-4 py-2 text-sm text-white rounded-lg font-medium"
                      style={{ backgroundColor: '#c0675a' }}>
                + Egreso
              </button>
            </div>
          </div>

          {/* Tabla movimientos */}
          <div className="bg-white rounded-xl border overflow-hidden"
               style={{ borderColor: 'var(--color-sage)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-primary)' }}>
                <tr>
                  {['Fecha','Tipo','Categoría','Concepto','Forma de pago','Monto',''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando…</td></tr>
                ) : movimientos.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin movimientos</td></tr>
                ) : movimientos.map(m => (
                  <tr key={m.id} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: m.tipo === 'ingreso' ? '#4a7c6a' : '#c0675a' }}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {m.categoria_nombre ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: m.categoria_color || '#887482' }} />
                          {m.categoria_nombre}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-dark)' }}>{m.concepto}</td>
                    <td className="px-4 py-2 text-gray-500 capitalize">{FORMA_PAGO_LABELS[m.forma_pago] || m.forma_pago}</td>
                    <td className="px-4 py-2 font-semibold"
                        style={{ color: m.tipo === 'ingreso' ? '#4a7c6a' : '#c0675a' }}>
                      {fmt(m.monto)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setMovModal({ tipo: m.tipo, movimiento: m })}
                                className="p-1 rounded hover:bg-gray-100">
                          <Pencil className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button onClick={() => setDeletingMov(m)}
                                className="p-1 rounded hover:bg-gray-100">
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Corte de Caja ───────────────────────────────────────────────── */}
      {tab === 'corte' && <CorteResumen rol={rol} />}

      {/* ── Tab: Reportes ────────────────────────────────────────────────────── */}
      {tab === 'reportes' && <ReportesFinanzas />}

      {/* ── Tab: Categorías (solo admin) ─────────────────────────────────────── */}
      {tab === 'categorias' && rol === 'admin' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setCatModal({})}
                    className="px-4 py-2 text-sm text-white rounded-lg"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
              + Nueva categoría
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden"
               style={{ borderColor: 'var(--color-sage)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-primary)' }}>
                <tr>
                  {['Color','Nombre','Tipo','Activo',''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorias.map(c => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                    <td className="px-4 py-2">
                      <span className="w-4 h-4 rounded-full inline-block"
                            style={{ backgroundColor: c.color }} />
                    </td>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-dark)' }}>{c.nombre}</td>
                    <td className="px-4 py-2 capitalize text-gray-500">{c.tipo}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleToggleCategoria(c)}
                              className="text-xs px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: c.activo ? '#4a7c6a' : '#d1d5db',
                                color: c.activo ? '#4a7c6a' : '#9ca3af',
                              }}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setCatModal({ categoria: c })}
                                className="p-1 rounded hover:bg-gray-100">
                          <Pencil className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button onClick={() => handleDeleteCategoria(c.id)}
                                className="p-1 rounded hover:bg-gray-100">
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modales ──────────────────────────────────────────────────────────── */}
      {movModal && (
        <MovimientoModal
          tipo={movModal.tipo}
          movimiento={movModal.movimiento}
          categorias={categorias}
          onSave={handleSaveMovimiento}
          onClose={() => setMovModal(null)}
        />
      )}

      {catModal && (
        <CategoriaModal
          categoria={catModal.categoria}
          onSave={handleSaveCategoria}
          onClose={() => setCatModal(null)}
        />
      )}

      {/* Confirmación eliminar movimiento */}
      {deletingMov && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-dark)' }}>
              Eliminar movimiento
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-accent)' }}>
              ¿Eliminar "{deletingMov.concepto}" por {fmt(deletingMov.monto)}?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingMov(null)}
                      className="flex-1 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
                Cancelar
              </button>
              <button onClick={() => handleDeleteMovimiento(deletingMov.id)}
                      className="flex-1 py-2 text-sm text-white rounded-lg font-medium"
                      style={{ backgroundColor: '#c0675a' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
