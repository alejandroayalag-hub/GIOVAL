// Prueba contra la base LOCAL: cosmetóloga/enfermera ligada solo ve sus pacientes; venta de farmacia con cliente.
// Levanta el backend en el puerto 3999 y deja la base como estaba. Uso: node scripts/check-mis-pacientes.js
require('dotenv').config({ quiet: true });
const assert = require('assert');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');
const pool = require('../src/db/pool');

const PORT = 3999;
const q = async (sql, p) => (await pool.query(sql, p)).rows;

(async () => {
  if (!['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) throw new Error('Solo contra base local');
  const server = spawn('node', ['src/index.js'], { cwd: `${__dirname}/..`, env: { ...process.env, PORT }, stdio: 'ignore' });
  const ids = {};
  try {
    for (let i = 0; i < 50; i++) {
      try { await fetch(`http://localhost:${PORT}/api/health`); break; } catch { await new Promise(r => setTimeout(r, 200)); }
    }
    const emp = (nombre) => q(`INSERT INTO empleados (nombre, apellido_paterno, curp, rfc, fecha_ingreso, email, puesto)
                               VALUES ($1, 'Test', $3, $4, CURRENT_DATE, $2, 'Cosmetóloga') RETURNING id`, [nombre, `${nombre}@t`, `ZZ${nombre}`, `ZZ${nombre}`]);
    ids.e1 = (await emp('CosmeA'))[0].id;
    ids.e2 = (await emp('CosmeB'))[0].id;
    ids.u = (await q(`INSERT INTO usuarios (nombre, email, password, rol, empleado_id) VALUES ('CosmeA', 'cosme-a@t', 'x', 'cosmetista', $1) RETURNING id`, [ids.e1]))[0].id;
    ids.uf = (await q(`INSERT INTO usuarios (nombre, email, password, rol) VALUES ('FarmT', 'farm-t@t', 'x', 'farmacia') RETURNING id`))[0].id;
    const pac = (n) => q(`INSERT INTO pacientes (nombre, apellido_paterno) VALUES ($1, 'ZZTest') RETURNING id`, [n]);
    ids.pMio = (await pac('Mio'))[0].id;
    ids.pAjeno = (await pac('Ajeno'))[0].id;
    await q(`INSERT INTO citas (nombre_paciente, paciente_id, empleada_id, fecha_hora) VALUES ('Mio', $1, $2, NOW()), ('Ajeno', $3, $4, NOW())`,
      [ids.pMio, ids.e1, ids.pAjeno, ids.e2]);

    const tok = (id, rol) => jwt.sign({ id, rol }, process.env.JWT_SECRET);
    const get = (path, t) => fetch(`http://localhost:${PORT}/api${path}`, { headers: { Authorization: `Bearer ${t}` } });
    const post = (path, t, body) => fetch(`http://localhost:${PORT}/api${path}`, { method: 'POST', body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } });
    const T = tok(ids.u, 'cosmetista');

    // Listados acotados
    const lista = await (await get('/pacientes', T)).json();
    assert.ok(lista.some(p => p.id === ids.pMio) && !lista.some(p => p.id === ids.pAjeno), 'lista de pacientes');
    const busq = await (await get('/pacientes/buscar?q=ZZTest', T)).json();
    assert.deepEqual(busq.map(p => p.id), [ids.pMio], 'búsqueda');
    const citas = await (await get('/citas', T)).json();
    assert.ok(citas.length && citas.every(c => c.empleada_id === ids.e1), 'agenda');

    // Detalle / expediente
    assert.equal((await get(`/pacientes/${ids.pMio}`, T)).status, 200);
    assert.equal((await get(`/pacientes/${ids.pAjeno}`, T)).status, 403);
    assert.equal((await get(`/notas-visita/paciente/${ids.pAjeno}`, T)).status, 403);
    assert.equal((await get(`/consentimientos/firmados/paciente/${ids.pAjeno}`, T)).status, 403);
    assert.notEqual((await get(`/consentimientos/firmados/paciente/${ids.pMio}`, T)).status, 403);

    // Admin ve todo
    const TA = tok(ids.u, 'admin');
    assert.equal((await get(`/pacientes/${ids.pAjeno}`, TA)).status, 200);

    // Farmacia: cliente externo + venta ligada
    const TF = tok(ids.uf, 'farmacia');
    ids.prod = (await q(`INSERT INTO farmacia_productos (nombre, codigo_proveedor, precio_costo, precio_venta, stock) VALUES ('ZZ', 'Z', 1, 2, 5) RETURNING id`))[0].id;
    assert.equal((await post('/farmacia/caja/abrir', TF, { efectivo_inicial: 0 })).status, 201);
    const cli = await (await post('/farmacia/clientes', TF, { nombre: 'ZZ Externo', telefono: '555' })).json();
    const encontrados = await (await get('/farmacia/clientes?q=ZZTest', TF)).json();
    assert.ok(encontrados.some(c => c.tipo === 'paciente' && c.id === ids.pMio) && !('email' in encontrados[0]), 'búsqueda clientes');
    const v = await (await post('/farmacia/ventas/checkout', TF, { items: [{ producto_id: ids.prod, cantidad: 1 }], metodo_pago: 'efectivo', cliente_id: cli.id })).json();
    assert.equal(v.cliente_id, cli.id);
    const ventas = await (await get('/farmacia/ventas', TF)).json();
    assert.equal(ventas[0].cliente, 'ZZ Externo');
    ids.cli = cli.id;
    console.log('✅ check-mis-pacientes OK');
  } finally {
    server.kill();
    await q('DELETE FROM farmacia_items_venta WHERE producto_id = $1', [ids.prod || 0]);
    await q('DELETE FROM farmacia_ventas WHERE empleado_id = $1', [ids.uf || 0]);
    await q('DELETE FROM farmacia_caja WHERE empleado_id = $1', [ids.uf || 0]);
    await q('DELETE FROM farmacia_productos WHERE id = $1', [ids.prod || 0]);
    await q('DELETE FROM farmacia_clientes WHERE id = $1', [ids.cli || 0]);
    await q('DELETE FROM citas WHERE paciente_id = ANY($1::int[])', [[ids.pMio || 0, ids.pAjeno || 0]]);
    await q('DELETE FROM pacientes WHERE id = ANY($1::int[])', [[ids.pMio || 0, ids.pAjeno || 0]]);
    await q('DELETE FROM usuarios WHERE id = ANY($1::int[])', [[ids.u || 0, ids.uf || 0]]);
    await q('DELETE FROM empleados WHERE id = ANY($1::int[])', [[ids.e1 || 0, ids.e2 || 0]]);
    await pool.end();
  }
})().catch((e) => { console.error('❌', e); process.exit(1); });
