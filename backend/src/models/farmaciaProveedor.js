const pool = require('../db/pool');

class FarmaciaProveedor {
  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM farmacia_proveedores WHERE activo = true ORDER BY nombre');
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM farmacia_proveedores WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const { nombre, email, telefono, contacto } = data;
    const { rows } = await pool.query(
      'INSERT INTO farmacia_proveedores (nombre, email, telefono, contacto) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, email, telefono, contacto]
    );
    return rows[0];
  }

  static async update(id, data) {
    const { nombre, email, telefono, contacto } = data;
    const updates = [];
    const params = [];
    let paramNum = 1;

    if (nombre) { updates.push(`nombre = $${paramNum++}`); params.push(nombre); }
    if (email) { updates.push(`email = $${paramNum++}`); params.push(email); }
    if (telefono) { updates.push(`telefono = $${paramNum++}`); params.push(telefono); }
    if (contacto) { updates.push(`contacto = $${paramNum++}`); params.push(contacto); }

    if (updates.length === 0) return this.findById(id);
    params.push(id);

    const { rows } = await pool.query(`UPDATE farmacia_proveedores SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`, params);
    return rows[0];
  }

  static async desactivar(id) {
    await pool.query('UPDATE farmacia_proveedores SET activo = false WHERE id = $1', [id]);
  }
}

module.exports = FarmaciaProveedor;
