import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { getCuentasPorPagar, getResumenCXP, createCuentaPorPagar, updateCuentaPorPagar, deleteCuentaPorPagar } from '../../api/cuentasPorPagar';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const ESTATUS_COLORS = { pendiente: '#c0675a', parcial: '#d4a03a', liquidada: '#4a7c6a' };

const EMPTY_FORM = {
  folio_factura: '', proveedor_nombre: '', concepto: '', fecha_factura: '',
  fecha_vencimiento: '', importe_total: '', pagado: '', estatus: 'pendiente',
  forma_pago: '', observaciones: '',
};

export default function CuentasXPagarTab() {
  const [rows,    setRows]    = useState([]);
  const [resumen, setResumen] = useState(null);
  const [filtro,  setFiltro]  = useState('');
  const [form,    setForm]    = useState(null);
  const [editing, setEditing] = useState(null);
  const [error,   setError]   = useState(null);

  const cargar = () => {
    setError(null);
    Promise.all([getCuentasPorPagar(filtro || undefined), getResumenCXP()])
      .then(([r, s]) => { setRows(r); setResumen(s); })
      .catch(e => setError(e?.response?.data?.error || e.message || 'Error al cargar cuentas por pagar'));
  };

  useEffect(() => { cargar(); }, [filtro]);

  async function handleSave() {
    if (!form.concepto || !form.importe_total) return alert('Concepto e importe total son requeridos');
    const data = { ...form, importe_total: parseFloat(form.importe_total) || 0, pagado: parseFloat(form.pagado) || 0 };
    try {
      if (editing) await updateCuentaPorPagar(editing, data);
      else await createCuentaPorPagar(data);
      setForm(null); setEditing(null); cargar();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al guardar');
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta cuenta por pagar?')) return;
    try {
      await deleteCuentaPorPagar(id); cargar();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al eliminar');
    }
  }

  function startEdit(row) {
    setEditing(row.id);
    setForm({
      folio_factura:    row.folio_factura    || '',
      proveedor_nombre: row.proveedor_nombre || '',
      concepto:         row.concepto,
      fecha_factura:    row.fecha_factura?.slice(0, 10)    || '',
      fecha_vencimiento: row.fecha_vencimiento?.slice(0, 10) || '',
      importe_total:    row.importe_total,
      pagado:           row.pagado,
      estatus:          row.estatus,
      forma_pago:       row.forma_pago    || '',
      observaciones:    row.observaciones || '',
    });
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Resumen KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total pendiente', val: fmt(resumen.total_pendiente), color: '#c0675a' },
            { label: 'Pendientes',      val: resumen.count_pendiente,      color: '#c0675a' },
            { label: 'Parciales',       val: resumen.count_parcial,        color: '#d4a03a' },
            { label: 'Vencidas',        val: resumen.count_vencidas,       color: resumen.count_vencidas > 0 ? '#c0675a' : '#4a7c6a' },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl bg-gray-800 border border-gray-700 p-3">
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className="text-2xl font-bold" style={{ color }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Filtrar:</label>
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white">
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="parcial">Parciales</option>
            <option value="liquidada">Liquidadas</option>
          </select>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#887482' }}>
          <Plus size={14} /> Nueva factura
        </button>
      </div>

      {/* Inline add/edit form */}
      {form && (
        <div className="mb-4 rounded-xl border border-gray-600 bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            {editing ? 'Editar factura' : 'Nueva factura'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { field: 'folio_factura',     label: 'Folio Factura' },
              { field: 'proveedor_nombre',  label: 'Proveedor' },
              { field: 'fecha_factura',     label: 'Fecha Factura',     type: 'date' },
              { field: 'fecha_vencimiento', label: 'Fecha Vencimiento', type: 'date' },
              { field: 'importe_total',     label: 'Importe Total ($)',  type: 'number' },
              { field: 'pagado',            label: 'Pagado ($)',         type: 'number' },
              { field: 'forma_pago',        label: 'Forma de Pago' },
            ].map(({ field, label, type = 'text' }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input type={type} value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Concepto</label>
              <input value={form.concepto}
                onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Estatus</label>
              <select value={form.estatus} onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
                className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white">
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="liquidada">Liquidada</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-gray-400 block mb-1">Observaciones</label>
              <input value={form.observaciones}
                onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave}
              className="px-4 py-1.5 rounded text-sm font-medium text-white"
              style={{ background: '#4a7c6a' }}>
              Guardar
            </button>
            <button onClick={() => { setForm(null); setEditing(null); }}
              className="px-4 py-1.5 rounded text-sm text-gray-300 border border-gray-600">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Proveedor / Concepto</th>
              <th className="px-4 py-3 text-left">Folio</th>
              <th className="px-4 py-3 text-left">Vencimiento</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3 text-right">Pagado</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-left">Estatus</th>
              <th className="px-4 py-3 text-left">Forma Pago</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">Sin cuentas por pagar</td>
              </tr>
            )}
            {rows.map(r => {
              const vencida = r.fecha_vencimiento && r.fecha_vencimiento.slice(0, 10) < hoy && r.estatus !== 'liquidada';
              return (
                <tr key={r.id} className={`hover:bg-gray-800/50 ${vencida ? 'bg-red-950/20' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="text-white">{r.proveedor_nombre || '—'}</div>
                    <div className="text-xs text-gray-400">{r.concepto}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{r.folio_factura || '—'}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={vencida ? 'text-red-400 flex items-center gap-1' : 'text-gray-300'}>
                      {vencida && <AlertTriangle size={12} />}
                      {r.fecha_vencimiento?.slice(0, 10) || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-white">{fmt(r.importe_total)}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{fmt(r.pagado)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-white">
                    {fmt(parseFloat(r.importe_total || 0) - parseFloat(r.pagado || 0))}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ background: ESTATUS_COLORS[r.estatus] || '#887482' }}>
                      {r.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{r.forma_pago || '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-white">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
