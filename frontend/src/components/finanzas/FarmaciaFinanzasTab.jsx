// Finanzas › Farmacia: ingresos y egresos de farmacia, separados de la clínica. Solo admin (supervisión).
import { Fragment, useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import * as farmaciaAPI from '../../api/farmacia';
import { getCuentasPorPagar } from '../../api/cuentasPorPagar';
import CuentasXPagarTab from './CuentasXPagarTab';
import { EmpresaToggle, empresaSugerida } from './empresa';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const errMsg = e => e?.response?.data?.error || e.message || 'Error';
const fecha = d => new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
const input = 'border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white';

const CATEGORIAS = { compra: 'Compra a proveedor', renta: 'Renta', servicios: 'Servicios', otro: 'Otro' };
const SUBTABS = [['ventas', 'Ventas'], ['egresos', 'Egresos'], ['cortes', 'Cortes de caja'], ['cxp', 'Cuentas x pagar']];

function mesActual() {
  const d = new Date();
  const ini = new Date(d.getFullYear(), d.getMonth(), 1);
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return [iso(ini), iso(d)];
}

function Kpi({ label, value, color }) {
  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ color: color || '#e5e7eb' }}>{value}</div>
    </div>
  );
}

export default function FarmaciaFinanzasTab() {
  const [[desde, hasta], setRango] = useState(mesActual);
  const [sub, setSub] = useState('ventas');
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);

  const cargarResumen = () => farmaciaAPI.getResumenFinanzas(desde, hasta).then(setResumen).catch(e => setError(errMsg(e)));
  useEffect(() => { setError(null); cargarResumen(); }, [desde, hasta]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm text-gray-400">Del</label>
        <input type="date" value={desde} onChange={e => setRango([e.target.value, hasta])} className={input} />
        <label className="text-sm text-gray-400">al</label>
        <input type="date" value={hasta} onChange={e => setRango([desde, e.target.value])} className={input} />
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {resumen && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Kpi label={`Ingresos (${resumen.num_ventas} ventas)`} value={fmt(resumen.ingresos)} color="#4a7c6a" />
            <Kpi label="Costo de lo vendido" value={fmt(resumen.costo_vendido)} />
            <Kpi label="Utilidad bruta" value={fmt(resumen.utilidad_bruta)} color={resumen.utilidad_bruta >= 0 ? '#4a7c6a' : '#c0675a'} />
            <Kpi label="Egresos" value={fmt(resumen.egresos)} color="#c0675a" />
            <Kpi label="Flujo neto (ingresos − egresos)" value={fmt(resumen.flujo_neto)} color={resumen.flujo_neto >= 0 ? '#4a7c6a' : '#c0675a'} />
            <Kpi label="Por pagar a proveedores" value={fmt(resumen.por_pagar)} color={parseFloat(resumen.por_pagar) > 0 ? '#d4a03a' : undefined} />
            <Kpi label={`Diferencias de caja (${resumen.cortes_con_diferencia} cortes)`} value={fmt(resumen.diferencias_caja)} color={parseFloat(resumen.diferencias_caja) < 0 ? '#c0675a' : undefined} />
            <Kpi label={`Canceladas (${resumen.num_canceladas})`} value={fmt(resumen.monto_cancelado)} color={resumen.num_canceladas > 0 ? '#d4a03a' : undefined} />
          </div>
          <div className="text-xs text-gray-400 mb-4">
            Cobros: efectivo {fmt(resumen.ingresos_efectivo)} · terminal {fmt(resumen.ingresos_terminal)} · transferencia {fmt(resumen.ingresos_transferencia)}
            {' · '}Inventario a costo: {fmt(resumen.valor_inventario)}
            {resumen.productos_stock_bajo > 0 && ` · ${resumen.productos_stock_bajo} con stock bajo`}
            {resumen.productos_sin_precio > 0 && <span className="text-yellow-400"> · {resumen.productos_sin_precio} sin precio de venta (no se pueden vender)</span>}
          </div>
        </>
      )}

      <div className="flex gap-2 mb-4 border-b border-gray-700">
        {SUBTABS.map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
                  className={`px-3 py-2 text-sm border-b-2 -mb-px ${sub === id ? 'border-white text-white font-semibold' : 'border-transparent text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'ventas' && <Ventas desde={desde} hasta={hasta} onCambio={cargarResumen} />}
      {sub === 'egresos' && <Egresos desde={desde} hasta={hasta} onCambio={cargarResumen} />}
      {sub === 'cortes' && <Cortes desde={desde} hasta={hasta} />}
      {sub === 'cxp' && <CuentasXPagarTab area="farmacia" />}
    </div>
  );
}

function Ventas({ desde, hasta, onCambio }) {
  const [ventas, setVentas] = useState([]);
  const [abierta, setAbierta] = useState(null); // detalle de venta expandida
  const [error, setError] = useState(null);

  const cargar = () => farmaciaAPI.getVentas({ fecha_desde: desde, fecha_hasta: hasta }).then(setVentas).catch(e => setError(errMsg(e)));
  useEffect(() => { cargar(); }, [desde, hasta]);

  const toggle = async (v) => {
    if (abierta?.id === v.id) return setAbierta(null);
    try { setAbierta(await farmaciaAPI.getVenta(v.id)); } catch (e) { setError(errMsg(e)); }
  };

  const cancelar = async (v) => {
    if (!confirm(`¿Cancelar la venta #${v.numero_venta} por ${fmt(v.total)}? El stock regresa al inventario.`)) return;
    try { await farmaciaAPI.cancelarVenta(v.id); cargar(); onCambio(); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <div>
      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-400 border-b border-gray-700">
          <th className="py-2">#</th><th>Fecha</th><th>Vendió</th><th>Cliente</th><th>Método</th><th className="text-right">Total</th><th></th>
        </tr></thead>
        <tbody>
          {ventas.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-500">Sin ventas en el periodo</td></tr>}
          {ventas.map(v => (
            <Fragment key={v.id}>
              <tr className={`border-b border-gray-800 cursor-pointer ${v.estado === 'cancelada' ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                  onClick={() => toggle(v)}>
                <td className="py-2">{v.numero_venta}</td>
                <td>{fecha(v.fecha)}</td>
                <td>{v.vendedor}</td>
                <td>{v.cliente || 'Público general'}</td>
                <td>{v.metodo_pago}</td>
                <td className="text-right">{fmt(v.total)}</td>
                <td className="text-right">
                  {v.estado === 'pagada'
                    ? <button onClick={e => { e.stopPropagation(); cancelar(v); }} className="text-xs text-red-400 hover:underline">Cancelar</button>
                    : <span className="text-xs no-underline">cancelada</span>}
                </td>
              </tr>
              {abierta?.id === v.id && (
                <tr className="bg-gray-800/50"><td colSpan={7} className="px-4 py-2 text-gray-300">
                  {abierta.items.map(i => (
                    <div key={i.id}>{i.cantidad} × {i.nombre} @ {fmt(i.precio_unitario)} = {fmt(i.subtotal)}
                      {i.costo_unitario && <span className="text-gray-500"> (costo {fmt(i.costo_unitario * i.cantidad)})</span>}</div>
                  ))}
                  {abierta.cancelada_en && <div className="text-yellow-400 mt-1">Cancelada {fecha(abierta.cancelada_en)}</div>}
                </td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EGRESO_VACIO = { fecha: '', categoria: 'compra', concepto: '', monto: '', forma_pago: 'transferencia', cxp_id: '' };

function Egresos({ desde, hasta, onCambio }) {
  const [rows, setRows] = useState([]);
  const [cxps, setCxps] = useState([]);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = () => farmaciaAPI.getEgresos(desde, hasta).then(setRows).catch(e => setError(errMsg(e)));
  useEffect(() => { cargar(); }, [desde, hasta]);

  const nuevo = async () => {
    setForm({ ...EGRESO_VACIO, empresa: empresaSugerida() });
    getCuentasPorPagar(undefined, 'farmacia').then(r => setCxps(r.filter(c => c.estatus !== 'liquidada'))).catch(() => {});
  };

  const elegirCxp = (id) => {
    const c = cxps.find(x => String(x.id) === id);
    setForm(f => ({ ...f, cxp_id: id, ...(c && { empresa: c.empresa, categoria: 'compra', monto: c.saldo_pendiente, concepto: `Pago factura ${c.folio_factura || ''} — ${c.proveedor_real || c.proveedor_nombre || ''}` }) }));
  };

  const guardar = async () => {
    if (guardando) return;
    if (!form.empresa) return setError('Elige la empresa: Giovanna PF o Elys PM');
    setGuardando(true);
    setError(null);
    try {
      await farmaciaAPI.createEgreso({ ...form, monto: parseFloat(form.monto), cxp_id: form.cxp_id || null, fecha: form.fecha || null });
      setForm(null); cargar(); onCambio();
    } catch (e) { setError(errMsg(e)); } finally { setGuardando(false); }
  };

  const borrar = async (e) => {
    if (!confirm(`¿Borrar el egreso "${e.concepto}"?${e.cxp_id ? ' El pago se descuenta de la factura.' : ''}`)) return;
    try { await farmaciaAPI.deleteEgreso(e.id); cargar(); onCambio(); } catch (err) { setError(errMsg(err)); }
  };

  return (
    <div>
      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
      <div className="flex justify-end mb-3">
        <button onClick={nuevo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: '#887482' }}>
          <Plus size={14} /> Registrar egreso
        </button>
      </div>

      {form && (
        <div className="mb-4 rounded-xl border border-gray-600 bg-gray-800 p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="text-xs text-gray-400 col-span-2 md:col-span-3">Empresa
            <span className="block mt-1"><span className="bg-white rounded-lg inline-block"><EmpresaToggle value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e, ...(e !== f.empresa && { cxp_id: '' }) }))} /></span></span>
          </div>
          <label className="text-xs text-gray-400 col-span-2 md:col-span-3">¿Paga una factura de proveedor? (opcional)
            <select value={form.cxp_id} onChange={e => elegirCxp(e.target.value)} className={`${input} w-full mt-1`}>
              <option value="">— No, egreso suelto —</option>
              {cxps.map(c => <option key={c.id} value={c.id}>{c.folio_factura || 's/folio'} · {c.proveedor_real || c.proveedor_nombre} · saldo {fmt(c.saldo_pendiente)}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400">Categoría
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={`${input} w-full mt-1`}>
              {Object.entries(CATEGORIAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400">Monto ($)
            <input type="number" min="0" step="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} className={`${input} w-full mt-1`} />
          </label>
          <label className="text-xs text-gray-400">Fecha
            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className={`${input} w-full mt-1`} />
          </label>
          <label className="text-xs text-gray-400 col-span-2">Concepto
            <input value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} className={`${input} w-full mt-1`} />
          </label>
          <label className="text-xs text-gray-400">Forma de pago
            <select value={form.forma_pago} onChange={e => setForm(f => ({ ...f, forma_pago: e.target.value }))} className={`${input} w-full mt-1`}>
              <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option><option value="otro">Otro</option>
            </select>
          </label>
          <div className="col-span-2 md:col-span-3 flex gap-2">
            <button onClick={guardar} disabled={guardando} className="px-4 py-1.5 rounded text-sm font-medium text-white" style={{ background: '#4a7c6a' }}>Guardar</button>
            <button onClick={() => setForm(null)} className="px-4 py-1.5 rounded text-sm text-gray-300 border border-gray-600">Cancelar</button>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-400 border-b border-gray-700">
          <th className="py-2">Fecha</th><th>Categoría</th><th>Concepto</th><th>Pago</th><th className="text-right">Monto</th><th></th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">Sin egresos en el periodo</td></tr>}
          {rows.map(e => (
            <tr key={e.id} className="border-b border-gray-800 text-gray-200">
              <td className="py-2">{e.fecha?.slice(0, 10)}</td>
              <td>{CATEGORIAS[e.categoria]}</td>
              <td>{e.concepto}{e.folio_factura && <span className="text-gray-500"> · factura {e.folio_factura}</span>}</td>
              <td>{e.forma_pago}</td>
              <td className="text-right">{fmt(e.monto)}</td>
              <td className="text-right">
                <button onClick={() => borrar(e)} aria-label="Borrar egreso" className="text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cortes({ desde, hasta }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    farmaciaAPI.getHistorialCaja({ fecha_desde: desde, fecha_hasta: hasta, limit: 200 }).then(setRows).catch(e => setError(errMsg(e)));
  }, [desde, hasta]);

  return (
    <div>
      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-400 border-b border-gray-700">
          <th className="py-2">Encargada</th><th>Apertura</th><th>Cierre</th><th className="text-right">Ventas</th>
          <th className="text-right">Esperado</th><th className="text-right">Contado</th><th className="text-right">Diferencia</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-500">Sin cortes en el periodo</td></tr>}
          {rows.map(c => {
            const dif = parseFloat(c.diferencia || 0);
            return (
              <tr key={c.id} className="border-b border-gray-800 text-gray-200">
                <td className="py-2">{c.empleado}</td>
                <td>{fecha(c.fecha_apertura)}</td>
                <td>{c.fecha_cierre ? fecha(c.fecha_cierre) : <span className="text-green-400">abierta</span>}</td>
                <td className="text-right">{fmt(c.total_ventas)} ({c.num_ventas})</td>
                <td className="text-right">{c.efectivo_esperado != null ? fmt(c.efectivo_esperado) : '—'}</td>
                <td className="text-right">{c.efectivo_final != null ? fmt(c.efectivo_final) : '—'}</td>
                <td className="text-right font-semibold" style={{ color: c.estado === 'cerrada' && dif !== 0 ? (dif < 0 ? '#c0675a' : '#d4a03a') : undefined }}>
                  {c.estado === 'cerrada' ? fmt(dif) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
