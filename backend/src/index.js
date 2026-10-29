const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const { requireRol } = require('./middleware/roles');
const { verificarQueryBody: misPacientes } = require('./middleware/misPacientes');
const runMigrations = require('./db/migrate');

const app = express();
const PORT = process.env.PORT || 3000;

// Detrás de Nginx (1 hop): usar X-Forwarded-For para IP real en rate limiting.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://62.238.3.136:8088',
    'http://62.238.3.136:8089',
    'https://gioval.mx',
    'https://www.gioval.mx',
    'http://localhost:5174',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '15mb' })); // firmas + fotos INE en data URL
app.use(require('./middleware/normalizeQuery'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rutas públicas
app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/public', require('./routes/public'));

// Rutas protegidas
app.use('/api/empleados', authMiddleware, require('./routes/empleados'));
app.use('/api/documentos', authMiddleware, require('./routes/documentos'));
app.use('/api/contratos', authMiddleware, require('./routes/contratos'));
app.use('/api/pagos',     authMiddleware, require('./routes/pagos'));
app.use('/api/formatos',  authMiddleware, require('./routes/formatos'));
app.use('/api/checadas', require('./routes/checadas'));
app.use('/api/citas',         authMiddleware, require('./routes/citas'));
app.use('/api/agenda-online', authMiddleware, require('./routes/agenda-online'));
const { insumosRouter, kitsRouter, tratamientoKitRouter } = require('./routes/insumos');
app.use('/api/insumos',      authMiddleware, insumosRouter);
app.use('/api/kits',         authMiddleware, kitsRouter);
app.use('/api/tratamientos', authMiddleware, tratamientoKitRouter);
app.use('/api/tratamientos',  authMiddleware, require('./routes/tratamientos'));
app.use('/api/pacientes',          authMiddleware, misPacientes, require('./routes/pacientes'));
app.use('/api/historias-clinicas',   authMiddleware, misPacientes, require('./routes/historias-clinicas'));
app.use('/api/notas-visita',         authMiddleware, misPacientes, require('./routes/notas-visita'));
app.use('/api/consentimientos',      authMiddleware, misPacientes, require('./routes/consentimientos'));
app.use('/api/documentos-clinicos',  authMiddleware, misPacientes, require('./routes/documentos-clinicos'));
app.use('/api/plan-tratamientos',    authMiddleware, misPacientes, require('./routes/planTratamientos'));
app.use('/api/fotos-cita',    authMiddleware, misPacientes, require('./routes/fotos-cita'));
app.use('/api/laboratorios',  authMiddleware, misPacientes, require('./routes/laboratorios'));
app.use('/api/expediente',    authMiddleware, misPacientes, require('./routes/expediente'));
app.use('/api/sync',               authMiddleware, require('./routes/sync'));
app.use('/api/usuarios',           authMiddleware, require('./routes/usuarios'));

app.use('/api/caja',         authMiddleware, require('./routes/caja'));
app.use('/api/consultorios', authMiddleware, require('./routes/consultorios'));
app.use('/api/flujo',        authMiddleware, require('./routes/flujo'));

// Módulo Farmacia
app.use('/api/farmacia', authMiddleware, require('./routes/farmacia'));
app.use('/api/finanzas-farmacia', authMiddleware, require('./routes/finanzas-farmacia'));

// Módulo Finanzas: Nómina y Cuentas por Pagar
const nominaRouter          = require('./routes/nomina');
const cuentasPorPagarRouter = require('./routes/cuentas-por-pagar');
app.use('/api/nomina',            authMiddleware, nominaRouter);
app.use('/api/cuentas-por-pagar', authMiddleware, cuentasPorPagarRouter);

const finanzas = require('./routes/finanzas');
app.use('/api/categorias-movimiento', authMiddleware, finanzas.categorias);
app.use('/api/movimientos',           authMiddleware, finanzas.movimientos);
app.use('/api/cortes-caja',           authMiddleware, finanzas.cortes);
app.use('/api/finanzas',              authMiddleware, finanzas.reportes);

// Rutas admin de solicitudes de cita (landing page)
const { listarSolicitudes, actualizarEstado } = require('./controllers/solicitudesPublicController');
app.get('/api/solicitudes-admin', authMiddleware, requireRol('admin'), listarSolicitudes);
app.patch('/api/solicitudes-admin/:id/estado', authMiddleware, requireRol('admin'), actualizarEstado);

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
