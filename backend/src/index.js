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
