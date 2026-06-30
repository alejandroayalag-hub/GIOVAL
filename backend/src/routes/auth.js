const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol, puede_caja: !!user.puede_caja },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, nombre: user.nombre, rol: user.rol, puede_caja: !!user.puede_caja, debe_cambiar_password: !!user.debe_cambiar_password });
  } catch (err) {
    next(err);
  }
});

router.put('/cambiar-password', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Sin autorización' });
    const token = authHeader.split(' ')[1];
    const { id } = jwt.verify(token, process.env.JWT_SECRET);

    const { password } = req.body;
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE usuarios SET password = $1, debe_cambiar_password = false WHERE id = $2',
      [hash, id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
