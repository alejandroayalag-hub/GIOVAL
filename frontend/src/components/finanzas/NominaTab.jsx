import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getNomina, getResumenNomina, createNomina, updateNomina, deleteNomina } from '../../api/nomina';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

const ROLES_SUGERIDOS = [
  'Dr./Dra. — Director(a) médico(a)',
  'Médico estético aplicador',
  'Enfermera / asistente médica',
  'Recepcionista / coordinadora',
  'Esteticista / terapeuta',
  'Esteticista / terapeuta 2',
  'Personal de limpieza',
  'Community manager / marketing',
  'Contador (honorarios)',
];

const EMPTY_FORM = { nombre_rol: '', sueldo_base: '', comision: '', bono: '', rfc: '', nss: '', observaciones: '' };

export default function NominaTab() {
  const hoy = new Date().toISOString().slice(0, 7);
  const [mes,     setMes]     = useState(hoy);
  const [rows,    setRows]    = useState([]);
  const [resumen, setResumen] = useState(null);
  const [form,    setForm]    = useState(null); // null = hidden, obj = add/edit
  const [editing, setEditing] = useState(null); // id being edited
  const [error,   setError]   = useState(null);

  const cargar = () => {
    setError(null);
    Promise.all([getNomina(mes), getResumenNomina(mes)])
      .then(([r, s]) => { setRows(r); setResumen(s); })
      .catch(e => setError(e?.response?.data?.error || e.message || 'Error al cargar nómina'));
  };

  useEffect(() => { cargar(); }, [mes]);

  async function handleSave() {
    if (!form.nombre_rol || !form.sueldo_base) return alert('Nombre del rol y sueldo base son requeridos');
    const data = {
      ...form,
      mes,
      sueldo_base: parseFloat(form.sueldo_base) || 0,
      comision:    parseFloat(form.comision)    || 0,
      bono:        parseFloat(form.bono)        || 0,
    };
    try {
      if (editing) await updateNomina(editing, data);
      else await createNomina(data);
      setForm(null); setEditing(null); cargar();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al guardar');
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro de nómina?')) return;
    try {
      await deleteNomina(id); cargar();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al eliminar');
    }
  }

  function startEdit(row) {
    setEditing(row.id);
    setForm({
      nombre_rol:   row.nombre_rol,
      sueldo_base:  row.sueldo_base,
      comision:     row.comision,
      bono:         row.bono,
      rfc:          row.rfc          || '',
      nss:          row.nss          || '',
      observaciones: row.observaciones || '',
    });
  }

  const totalBruto   = rows.reduce((s, r) => s + parseFloat(r.sueldo_base) + parseFloat(r.comision) + parseFloat(r.bono), 0);
  const totalEmpresa = rows.reduce((s, r) => s + parseFloat(r.sueldo_base) * 0.25, 0);

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Mes:</label>
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white"
          />
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#887482' }}
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      {/* Summary cards */}
      {resumen && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Nómina bruta empleados',   val: fmt(totalBruto) },
            { label: 'IMSS + Infonavit (25% aprox)', val: fmt(totalBruto * 0.25) },
            { label: 'Costo total empresa',       val: fmt(totalBruto * 1.25) },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl bg-gray-800 border border-gray-700 p-3">
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className="text-xl font-bold text-white">{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Inline add/edit form */}
      {form && (
        <div className="mb-4 rounded-xl border border-gray-600 bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            {editing ? 'Editar registro' : 'Nuevo registro'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-gray-400 block mb-1">Nombre / Rol</label>
              <input
                list="roles-sugeridos"
                value={form.nombre_rol}
                onChange={e => setForm(p => ({ ...p, nombre_rol: e.target.value }))}
                className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white"
                placeholder="Nombre o rol del empleado"
              />
              <datalist id="roles-sugeridos">
                {ROLES_SUGERIDOS.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
            {[
              { field: 'sueldo_base', label: 'Sueldo Base ($)' },
              { field: 'comision',    label: 'Comisión ($)' },
              { field: 'bono',        label: 'Bono ($)' },
              { field: 'rfc',         label: 'RFC',  text: true },
              { field: 'nss',         label: 'NSS',  text: true },
            ].map(({ field, label, text }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input
                  type={text ? 'text' : 'number'}
                  value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded text-sm font-medium text-white"
              style={{ background: '#4a7c6a' }}
            >
              Guardar
            </button>
            <button
              onClick={() => { setForm(null); setEditing(null); }}
              className="px-4 py-1.5 rounded text-sm text-gray-300 border border-gray-600"
            >
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
              <th className="px-4 py-3 text-left">Nombre / Rol</th>
              <th className="px-4 py-3 text-right">Sueldo Base</th>
              <th className="px-4 py-3 text-right">Comisión</th>
              <th className="px-4 py-3 text-right">Bono</th>
              <th className="px-4 py-3 text-right">Total Empleado</th>
              <th className="px-4 py-3 text-right">IMSS+INFONAVIT</th>
              <th className="px-4 py-3 text-right">Costo Empresa</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  Sin registros para {mes}
                </td>
              </tr>
            )}
            {rows.map(r => {
              const totalEmpleado = parseFloat(r.sueldo_base) + parseFloat(r.comision) + parseFloat(r.bono);
              const imss = parseFloat(r.sueldo_base) * 0.25;
              return (
                <tr key={r.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-white">{r.nombre_rol}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{fmt(r.sueldo_base)}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{fmt(r.comision)}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{fmt(r.bono)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-white">{fmt(totalEmpleado)}</td>
                  <td className="px-4 py-2 text-right text-gray-400">{fmt(imss)}</td>
                  <td className="px-4 py-2 text-right font-semibold" style={{ color: '#aba3ba' }}>
                    {fmt(totalEmpleado + imss)}
                  </td>
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
            {rows.length > 0 && (
              <tr className="bg-gray-800 font-bold">
                <td className="px-4 py-2 text-gray-200">TOTAL</td>
                <td colSpan={3}></td>
                <td className="px-4 py-2 text-right text-white">{fmt(totalBruto)}</td>
                <td className="px-4 py-2 text-right text-gray-400">{fmt(totalEmpresa)}</td>
                <td className="px-4 py-2 text-right" style={{ color: '#aba3ba' }}>
                  {fmt(totalBruto + totalEmpresa)}
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
