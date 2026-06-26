import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import EmpleadosPage from './pages/EmpleadosPage';
import EmpleadoDetallePage from './pages/EmpleadoDetallePage';
import EmpleadoFormPage from './pages/EmpleadoFormPage';
import MapeoChecadorPage from './pages/MapeoChecadorPage';
import PagosPage from './pages/PagosPage';
import FormatosPage from './pages/FormatosPage';
import CitasPage from './pages/CitasPage';
import TratamientosPage from './pages/TratamientosPage';
import PacientesPage from './pages/PacientesPage';
import PacienteDetallePage from './pages/PacienteDetallePage';
import FinanzasPage from './pages/FinanzasPage';
import ProcedimientosPage from './pages/ProcedimientosPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { FarmaciaProvider } from './context/FarmaciaContext';
import FarmaciaDashboard from './pages/farmacia/FarmaciaDashboard';
import FarmaciaPOS from './pages/farmacia/FarmaciaPOS';
import FarmaciaInventario from './pages/farmacia/FarmaciaInventario';
import FarmaciaCatalogos from './pages/farmacia/FarmaciaCatalogos';
import WelcomePage from './pages/WelcomePage';
import logoGioval from './assets/gioval-logo.png';
import logoGV    from './assets/gioval-gv.png';
import logoBadge from './assets/gioval-badge.png';

function NavItem({ to, end, children }) {
  return (
    <NavLink to={to} end={end}
             className={({ isActive }) =>
               `text-sm px-3 py-1 rounded-lg transition-colors ${isActive ? 'font-semibold' : 'hover:opacity-75'}`
             }
             style={({ isActive }) => ({
               backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
               color: isActive ? 'white' : 'var(--color-dark)',
             })}>
      {children}
    </NavLink>
  );
}

function NavDropdown({ label, basePaths, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const isActive = basePaths.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
              className={`text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${isActive ? 'font-semibold' : 'hover:opacity-75'}`}
              style={{ backgroundColor: isActive ? 'var(--color-accent)' : 'transparent', color: isActive ? 'white' : 'var(--color-dark)' }}>
        {label}
        <span className="text-xs opacity-70">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-lg border py-1 min-w-36"
             style={{ borderColor: 'var(--color-sage)' }}
             onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({ to, children }) {
  return (
    <NavLink to={to}
             className={({ isActive }) =>
               `block px-4 py-2 text-sm transition-colors ${isActive ? 'font-semibold' : 'hover:opacity-75'}`
             }
             style={({ isActive }) => ({ color: isActive ? 'var(--color-accent)' : 'var(--color-dark)' })}>
      {children}
    </NavLink>
  );
}

function Layout() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('nombre');
  const rol = localStorage.getItem('rol');
  const puede_caja = localStorage.getItem('puede_caja') === 'true';

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('rol');
    localStorage.removeItem('puede_caja');
    navigate('/login');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <nav className="px-6 py-2 flex items-center gap-3 shadow-sm border-b"
           style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-sage)' }}>
        {/* Logo imagen real */}
        <NavLink to="/" className="mr-4 flex-shrink-0">
          <img src={logoGioval} alt="gioval" className="h-9 object-contain"
               style={{ filter: 'brightness(0.4) sepia(1) saturate(0.5)' }} />
        </NavLink>

        <div className="flex gap-1 flex-1 flex-wrap">
          <NavItem to="/" end>Inicio</NavItem>
          <NavItem to="/citas">Citas</NavItem>
          <NavItem to="/procedimientos">En vivo</NavItem>
          <NavItem to="/pacientes">Pacientes</NavItem>
          {rol === 'admin' && <NavItem to="/empleados">Empleados</NavItem>}
          {(rol === 'admin' || rol === 'asistente_medico' || rol === 'cosmetista') && <NavItem to="/tratamientos">Tratamientos</NavItem>}
          {(rol === 'admin' || puede_caja) && <NavItem to="/finanzas">Finanzas</NavItem>}
          {rol === 'admin' && <NavItem to="/farmacia">Farmacia</NavItem>}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--color-dark)', opacity: 0.7 }}>
            {nombre} {rol === 'admin' ? '· Admin' : '· Asistente'}
          </span>
          <button onClick={logout}
                  className="text-xs border rounded px-2 py-1 hover:opacity-75"
                  style={{ borderColor: 'var(--color-dark)', color: 'var(--color-dark)' }}>
            Salir
          </button>
        </div>
      </nav>

      {/* GV watermark */}
      <img src={logoGV} alt="" aria-hidden="true"
           style={{ position: 'fixed', bottom: '-60px', right: '-60px', width: '420px',
                    opacity: 0.05, pointerEvents: 'none', zIndex: 0, userSelect: 'none' }} />

      {/* Badge esquina inferior derecha */}
      <img src={logoBadge} alt="Gioval Medicina Estética"
           style={{ position: 'fixed', bottom: '20px', right: '20px', width: '72px',
                    opacity: 0.75, pointerEvents: 'none', zIndex: 50 }} />

      <main className="max-w-7xl mx-auto p-6" style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/bienvenida" element={<WelcomePage />} />
          <Route path="/" element={<DashboardPage />} />
          <Route path="/citas" element={<CitasPage />} />
          <Route path="/procedimientos" element={<ProcedimientosPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/pacientes/:id" element={<PacienteDetallePage />} />
          {rol === 'admin' && <Route path="/empleados" element={<EmpleadosPage />} />}
          {rol === 'admin' && <Route path="/empleados/nuevo" element={<EmpleadoFormPage />} />}
          {rol === 'admin' && <Route path="/empleados/:id" element={<EmpleadoDetallePage />} />}
          {rol === 'admin' && <Route path="/empleados/:id/editar" element={<EmpleadoFormPage />} />}
          <Route path="/pagos" element={<PagosPage />} />
          <Route path="/checador/mapeo" element={<MapeoChecadorPage />} />
          <Route path="/formatos" element={<FormatosPage />} />
          {(rol === 'admin' || rol === 'asistente_medico' || rol === 'cosmetista') && <Route path="/tratamientos" element={<TratamientosPage />} />}
          {(rol === 'admin' || puede_caja) && <Route path="/finanzas" element={<FinanzasPage />} />}
          <Route path="/farmacia" element={<FarmaciaDashboard />} />
          <Route path="/farmacia/pos" element={<FarmaciaPOS />} />
          <Route path="/farmacia/inventario" element={<FarmaciaInventario />} />
          <Route path="/farmacia/catalogos" element={<FarmaciaCatalogos />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <FarmaciaProvider>
              <Layout />
            </FarmaciaProvider>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
