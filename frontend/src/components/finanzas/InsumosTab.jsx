import { useState, useEffect } from 'react';
import { Pencil, Check, X, Plus, ScanLine } from 'lucide-react';
import { getInsumos, getCategoriasInsumos, updateInsumo, createInsumo, getInsumoByBarcode, entradaInsumo } from '../../api/insumos';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const NUEVO = { nombre: '', categoria: '', proveedor: '', presentacion: '', costo_unidad: '', precio_unitario: '', stock_minimo: '', codigo_barras: '', contenido_envase: '' };

export default function InsumosTab() {
  const [insumos,    setInsumos]    = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtro,     setFiltro]     = useState('');
  const [editing,    setEditing]    = useState(null); // { id, field, value }
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [nuevo,      setNuevo]      = useState(null); // form de alta o null
  const [guardando,  setGuardando]  = useState(false);

  // ── Entrada de inventario por escaneo ──
  const [alta,     setAlta]     = useState(false);
  const [scan,     setScan]     = useState('');
  const [hallado,  setHallado]  = useState(null);  // insumo | { notfound:true, codigo }
  const [envases,  setEnvases]  = useState(1);
  const [contInput,setContInput]= useState('');    // contenido_envase a capturar/vincular
  const [vincId,   setVincId]   = useState('');
  const [altaMsg,  setAltaMsg]  = useState(null);

  useEffect(() => {
    setError(null);
    Promise.all([getInsumos(), getCategoriasInsumos()])
      .then(([ins, cats]) => { setInsumos(ins); setCategorias(cats); })
      .catch(e => setError(e.message || 'Error al cargar insumos'))
      .finally(() => setLoading(false));
  }, []);

  const displayed = filtro
    ? insumos.filter(i => i.categoria === filtro)
    : insumos;

  async function saveEdit(insumo) {
    if (!editing) return;
    try {
      await updateInsumo(insumo.id, { [editing.field]: parseFloat(editing.value) || editing.value });
      setInsumos(prev => prev.map(i => i.id === insumo.id ? { ...i, [editing.field]: editing.value } : i));
    } catch (e) {
      setError(e.message || 'Error al guardar');
    }
    setEditing(null);
  }

  async function guardarNuevo() {
    if (!nuevo.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setGuardando(true);
    setError(null);
    try {
      const creado = await createInsumo({
        nombre:           nuevo.nombre.trim(),
        categoria:        nuevo.categoria || null,
        proveedor:        nuevo.proveedor || null,
        presentacion:     nuevo.presentacion || null,
        costo_unidad:     parseFloat(nuevo.costo_unidad) || 0,
        precio_unitario:  parseFloat(nuevo.precio_unitario) || 0,
        stock_minimo:     parseInt(nuevo.stock_minimo) || 0,
        codigo_barras:    nuevo.codigo_barras.trim() || null,
        contenido_envase: parseFloat(nuevo.contenido_envase) || null,
      });
      setInsumos(prev => [creado, ...prev]);
      if (creado.categoria && !categorias.includes(creado.categoria))
        setCategorias(prev => [...prev, creado.categoria].sort());
      setNuevo(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error al crear insumo');
    } finally {
      setGuardando(false);
    }
  }

  // ── Handlers de entrada por escaneo ──
  async function buscarBarcode() {
    const codigo = scan.trim();
    if (!codigo) return;
    setAltaMsg(null);
    try {
      const ins = await getInsumoByBarcode(codigo);
      setHallado(ins);
      setContInput(ins.contenido_envase ?? '');
      setEnvases(1);
    } catch (e) {
      if (e.response?.status === 404) { setHallado({ notfound: true, codigo }); setVincId(''); setContInput(''); }
      else setAltaMsg(e.response?.data?.error || e.message || 'Error al buscar');
    }
  }

  async function registrarEntrada() {
    try {
      let ins = hallado;
      if (ins.contenido_envase == null) {
        const c = parseFloat(contInput);
        if (!c || c <= 0) { setAltaMsg('Captura el contenido por envase'); return; }
        ins = await updateInsumo(ins.id, { contenido_envase: c });
        setInsumos(prev => prev.map(i => i.id === ins.id ? ins : i));
      }
      const n = parseInt(envases);
      const actualizado = await entradaInsumo(ins.id, n);
      setInsumos(prev => prev.map(i => i.id === actualizado.id ? actualizado : i));
      const agregado = parseFloat(ins.contenido_envase) * n;
      setAltaMsg(`✓ ${ins.nombre}: +${agregado} → stock ${actualizado.stock_actual}`);
      setHallado(null); setScan('');
    } catch (e) {
      setAltaMsg(e.response?.data?.error || e.message || 'Error al registrar entrada');
    }
  }

  async function vincular() {
    const c = parseFloat(contInput);
    if (!vincId) { setAltaMsg('Selecciona un insumo'); return; }
    if (!c || c <= 0) { setAltaMsg('Captura el contenido por envase'); return; }
    try {
      const ins = await updateInsumo(parseInt(vincId), { codigo_barras: hallado.codigo, contenido_envase: c });
      setInsumos(prev => prev.map(i => i.id === ins.id ? ins : i));
      setHallado(ins);
      setContInput(ins.contenido_envase ?? c);
      setEnvases(1);
      setAltaMsg(`Código vinculado a ${ins.nombre}. Ahora registra la entrada.`);
    } catch (e) {
      setAltaMsg(e.response?.data?.error || e.message || 'Error al vincular');
    }
  }

  function crearDesdeBarcode() {
    setNuevo({ ...NUEVO, codigo_barras: hallado.codigo });
    setAlta(false); setHallado(null); setScan('');
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando insumos…</div>;

  return (
    <div>
      {error && <div className="text-red-400 text-sm mb-3 px-3 py-2 rounded bg-red-900/20 border border-red-800/40">{error}</div>}

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-400">Categoría:</label>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white"
        >
          <option value="">Todas ({insumos.length})</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500">{displayed.length} insumos</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => { setAlta(a => !a); setHallado(null); setScan(''); setAltaMsg(null); }}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: '#5b6b7c' }}
          >
            <ScanLine size={15}/> Entrada por escaneo
          </button>
          <button
            onClick={() => setNuevo(nuevo ? null : { ...NUEVO })}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: '#7c6f93' }}
          >
            <Plus size={15}/> Nuevo insumo
          </button>
        </div>
      </div>

      {/* Panel de entrada por escaneo */}
      {alta && (
        <div className="mb-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-xs text-gray-500 mb-3">Enfoca el campo y escanea el código de barras del envase (o tecléalo y Enter).</p>
          <input
            autoFocus
            value={scan}
            onChange={e => setScan(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') buscarBarcode(); }}
            placeholder="Escanea o teclea código de barras…"
            className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none font-mono"
          />

          {altaMsg && <div className="mt-3 text-sm text-gray-200 px-3 py-2 rounded bg-gray-900/60 border border-gray-700">{altaMsg}</div>}

          {/* Insumo encontrado (o recién vinculado) → registrar entrada */}
          {hallado && !hallado.notfound && (
            <div className="mt-3 rounded-lg bg-gray-900/60 border border-gray-700 p-3">
              <p className="text-sm text-white font-medium">{hallado.nombre}</p>
              <p className="text-xs text-gray-500 mb-2">{hallado.codigo} · stock actual: {hallado.stock_actual ?? '—'}</p>
              {hallado.contenido_envase == null && (
                <div className="mb-2">
                  <label className="text-xs text-gray-400 block mb-1">Contenido por envase (unidad base, ej. 150):</label>
                  <input type="number" step="0.0001" min="0.0001" value={contInput}
                    onChange={e => setContInput(e.target.value)}
                    className="w-32 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 outline-none"/>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1"># envases</label>
                  <input type="number" min="1" value={envases}
                    onChange={e => setEnvases(e.target.value)}
                    className="w-20 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 outline-none"/>
                </div>
                <button onClick={registrarEntrada}
                  className="text-sm px-4 py-1.5 rounded-lg text-white" style={{ backgroundColor: '#4a7c6a' }}>
                  Registrar entrada
                </button>
              </div>
            </div>
          )}

          {/* Código no registrado → vincular o crear */}
          {hallado?.notfound && (
            <div className="mt-3 rounded-lg bg-gray-900/60 border border-gray-700 p-3">
              <p className="text-sm text-amber-300 mb-3">Código <span className="font-mono">{hallado.codigo}</span> no registrado.</p>

              <p className="text-xs text-gray-400 mb-1">Vincular a un insumo existente:</p>
              <div className="flex flex-wrap items-end gap-2 mb-3">
                <select value={vincId} onChange={e => setVincId(e.target.value)}
                  className="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 outline-none max-w-xs">
                  <option value="">— Selecciona insumo —</option>
                  {insumos.map(i => <option key={i.id} value={i.id}>{i.codigo} · {i.nombre}</option>)}
                </select>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Contenido/envase</label>
                  <input type="number" step="0.0001" min="0.0001" value={contInput}
                    onChange={e => setContInput(e.target.value)} placeholder="ej. 150"
                    className="w-24 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 outline-none"/>
                </div>
                <button onClick={vincular}
                  className="text-sm px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: '#5b6b7c' }}>
                  Vincular
                </button>
              </div>

              <p className="text-xs text-gray-500">
                ¿Producto nuevo? <button onClick={crearDesdeBarcode} className="text-purple-300 hover:text-purple-200 underline">Crear insumo con este código</button>
              </p>
            </div>
          )}
        </div>
      )}

      {nuevo && (
        <div className="mb-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-xs text-gray-500 mb-3">Código autogenerado (MAN-###). Solo el nombre es obligatorio.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input placeholder="Nombre *" value={nuevo.nombre}
              onChange={e => setNuevo(p => ({ ...p, nombre: e.target.value }))}
              className="col-span-2 md:col-span-3 bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none" autoFocus/>
            <input placeholder="Categoría" value={nuevo.categoria} list="cats-insumo"
              onChange={e => setNuevo(p => ({ ...p, categoria: e.target.value }))}
              className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none"/>
            <datalist id="cats-insumo">{categorias.map(c => <option key={c} value={c}/>)}</datalist>
            <input placeholder="Proveedor" value={nuevo.proveedor}
              onChange={e => setNuevo(p => ({ ...p, proveedor: e.target.value }))}
              className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none"/>
            <input placeholder="Presentación (ej. 150 mL/g)" value={nuevo.presentacion}
              onChange={e => setNuevo(p => ({ ...p, presentacion: e.target.value }))}
              className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none"/>
            <input type="number" step="0.0001" min="0" placeholder="Costo/unidad" value={nuevo.costo_unidad}
              onChange={e => setNuevo(p => ({ ...p, costo_unidad: e.target.value }))}
              className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none"/>
            <input type="number" step="0.01" min="0" placeholder="Precio unitario" value={nuevo.precio_unitario}
              onChange={e => setNuevo(p => ({ ...p, precio_unitario: e.target.value }))}
              className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none"/>
            <input type="number" min="0" placeholder="Stock mínimo" value={nuevo.stock_minimo}
              onChange={e => setNuevo(p => ({ ...p, stock_minimo: e.target.value }))}
              className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none"/>
            <input placeholder="Código de barras" value={nuevo.codigo_barras}
              onChange={e => setNuevo(p => ({ ...p, codigo_barras: e.target.value }))}
              className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none font-mono"/>
            <input type="number" step="0.0001" min="0" placeholder="Contenido/envase (ej. 150)" value={nuevo.contenido_envase}
              onChange={e => setNuevo(p => ({ ...p, contenido_envase: e.target.value }))}
              className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none"/>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={guardarNuevo} disabled={guardando}
              className="text-sm px-4 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: '#7c6f93' }}>
              {guardando ? 'Guardando…' : 'Crear insumo'}
            </button>
            <button onClick={() => { setNuevo(null); setError(null); }}
              className="text-sm px-4 py-1.5 rounded-lg text-gray-300 border border-gray-600 hover:bg-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Presentación</th>
              <th className="px-4 py-3 text-right">Precio Unit.</th>
              <th className="px-4 py-3 text-right">Costo/Unidad</th>
              <th className="px-4 py-3 text-right">Stock Mín.</th>
              <th className="px-4 py-3 text-right">Stock Act.</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {displayed.map(ins => (
              <tr key={ins.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-2 text-gray-400 font-mono text-xs">
                  {ins.codigo}
                  {ins.codigo_barras && <span className="ml-1 text-gray-600" title={`Barcode: ${ins.codigo_barras}`}>▮</span>}
                </td>
                <td className="px-4 py-2 text-white">{ins.nombre}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{ins.presentacion}</td>
                <td className="px-4 py-2 text-right text-gray-300">{fmt(ins.precio_unitario)}</td>
                <td className="px-4 py-2 text-right text-gray-300">{fmt(ins.costo_unidad)}</td>
                {/* Editable: stock_minimo */}
                <td className="px-4 py-2 text-right">
                  {editing?.id === ins.id && editing.field === 'stock_minimo' ? (
                    <span className="flex items-center justify-end gap-1">
                      <input type="number" value={editing.value} min={0}
                        onChange={e => setEditing(p => ({ ...p, value: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(ins); if (e.key === 'Escape') setEditing(null); }}
                        onBlur={() => saveEdit(ins)}
                        autoFocus
                        className="w-16 text-right text-sm bg-gray-700 border border-gray-500 rounded px-1 text-white"
                      />
                      <button onClick={() => saveEdit(ins)} className="text-green-400 hover:text-green-300"><Check size={14}/></button>
                      <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-1 cursor-pointer group"
                          onClick={() => setEditing({ id: ins.id, field: 'stock_minimo', value: ins.stock_minimo })}>
                      <span className="text-gray-300">{ins.stock_minimo}</span>
                      <Pencil size={11} className="text-gray-600 group-hover:text-gray-400"/>
                    </span>
                  )}
                </td>
                {/* Editable: stock_actual */}
                <td className="px-4 py-2 text-right">
                  {editing?.id === ins.id && editing.field === 'stock_actual' ? (
                    <span className="flex items-center justify-end gap-1">
                      <input type="number" value={editing.value ?? ''} min={0}
                        onChange={e => setEditing(p => ({ ...p, value: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(ins); if (e.key === 'Escape') setEditing(null); }}
                        onBlur={() => saveEdit(ins)}
                        autoFocus
                        className="w-16 text-right text-sm bg-gray-700 border border-gray-500 rounded px-1 text-white"
                      />
                      <button onClick={() => saveEdit(ins)} className="text-green-400 hover:text-green-300"><Check size={14}/></button>
                      <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-1 cursor-pointer group"
                          onClick={() => setEditing({ id: ins.id, field: 'stock_actual', value: ins.stock_actual ?? '' })}>
                      <span className={ins.stock_actual !== null && ins.stock_actual <= ins.stock_minimo ? 'text-red-400' : 'text-gray-300'}>
                        {ins.stock_actual ?? '—'}
                      </span>
                      <Pencil size={11} className="text-gray-600 group-hover:text-gray-400"/>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
