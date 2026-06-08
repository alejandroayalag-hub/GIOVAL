const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const runMigrations = require('./db/migrate');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rutas públicas
app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Rutas protegidas
app.use('/api/empleados', authMiddleware, require('./routes/empleados'));
app.use('/api/documentos', authMiddleware, require('./routes/documentos'));
app.use('/api/contratos', authMiddleware, require('./routes/contratos'));
app.use('/api/pagos',     authMiddleware, require('./routes/pagos'));
app.use('/api/formatos',  authMiddleware, require('./routes/formatos'));
app.use('/api/checadas', require('./routes/checadas'));
app.use('/api/citas',         authMiddleware, require('./routes/citas'));
app.use('/api/tratamientos',  authMiddleware, require('./routes/tratamientos'));
app.use('/api/pacientes',          authMiddleware, require('./routes/pacientes'));
app.use('/api/historias-clinicas', authMiddleware, require('./routes/historias-clinicas'));
app.use('/api/notas-visita',       authMiddleware, require('./routes/notas-visita'));
app.use('/api/consentimientos',    authMiddleware, require('./routes/consentimientos'));
app.use('/api/sync',               authMiddleware, require('./routes/sync'));
app.use('/api/usuarios',           authMiddleware, require('./routes/usuarios'));

const finanzas = require('./routes/finanzas');
app.use('/api/categorias-movimiento', authMiddleware, finanzas.categorias);
app.use('/api/movimientos',           authMiddleware, finanzas.movimientos);
app.use('/api/cortes-caja',           authMiddleware, finanzas.cortes);

app.use(errorHandler);

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend Elys corriendo en puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error en migraciones:', err);
    process.exit(1);
  });
