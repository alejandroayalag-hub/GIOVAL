const pool = require('../db/pool');

class FarmaciaCliente {
  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM farmacia_clientes ORDER BY creado_en DESC LIMIT 100');
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM farmacia_clientes WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async findOrCreateByPaciente(paciente_id) {
    const { rows } = await pool.query('SELECT * FROM farmacia_clientes WHERE paciente_id = $1', [paciente_id]);
    if (rows.length > 0) return rows[0];

    const { rows: newRows } = await pool.query(
      'INSERT INTO farmacia_clientes (paciente_id) VALUES ($1) RETURNING *',
      [paciente_id]
    );
    return newRows[0];
  }

  static async create(data) {
    const { nombre, telefono, email, paciente_id } = data;
    const { rows } = await pool.query(
      'INSERT INTO farmacia_clientes (nombre, telefono, email, paciente_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre || null, telefono || null, email || null, paciente_id || null]
    );
    return rows[0];
  }

  static async update(id, data) {
    const { nombre, telefono, email } = data;
    const updates = [];
    const params = [];
    let paramNum = 1;

    if (nombre) { updates.push(`nombre = $${paramNum++}`); params.push(nombre); }
    if (telefono) { updates.push(`telefono = $${paramNum++}`); params.push(telefono); }
    if (email) { updates.push(`email = $${paramNum++}`); params.push(email); }

    if (updates.length === 0) return this.findById(id);
    params.push(id);

    const { rows } = await pool.query(`UPDATE farmacia_clientes SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`, params);
    return rows[0];
  }

  static async registrarCompra(id) {
    await pool.query('UPDATE farmacia_clientes SET ultima_compra = NOW() WHERE id = $1', [id]);
  }
}

module.exports = FarmaciaCliente;
