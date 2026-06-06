import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import EmpleadosPage from './pages/EmpleadosPage';
import EmpleadoDetallePage from './pages/EmpleadoDetallePage';
import EmpleadoFormPage from './pages/EmpleadoFormPage';
import MapeoChecadorPage from './pages/MapeoChecadorPage';
import PagosPage from './pages/PagosPage';
import FormatosPage from './pages/FormatosPage';
import CitasPage from './pages/CitasPage';
import TratamientosPage from './pages/TratamientosPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

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

function Layout() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('nombre');
  const rol = localStorage.getItem('rol');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('rol');
    navigate('/login');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <nav className="px-6 py-3 flex items-center gap-3 shadow-sm border-b"
           style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-sage)' }}>
        <div className="flex flex-col leading-tight mr-4">
          <span className="font-bold text-base tracking-wide" style={{ color: 'var(--color-dark)' }}>Elys</span>
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-dark)', opacity: 0.6 }}>
            Clínica de Belleza
          </span>
        </div>
        <div className="flex gap-1 flex-1 flex-wrap">
          <NavItem to="/citas">Citas</NavItem>
          <NavItem to="/" end>Empleados</NavItem>
          <NavItem to="/pagos">Pagos</NavItem>
          <NavItem to="/checador/mapeo">Checador</NavItem>
          <NavItem to="/formatos">Formatos</NavItem>
          {rol === 'admin' && <NavItem to="/tratamientos">Tratamientos</NavItem>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--color-dark)', opacity: 0.7 }}>
            {nombre} {rol === 'admin' ? '· Admin' : '· Asistente'}
          </span>
          <button onClick={logout}
                  className="text-xs border rounded px-2 py-1 transition-colors hover:opacity-75"
                  style={{ borderColor: 'var(--color-dark)', color: 'var(--color-dark)' }}>
            Salir
          </button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">
        <Routes>
          <Route path="/citas" element={<CitasPage />} />
          <Route path="/" element={<EmpleadosPage />} />
          <Route path="/empleados/nuevo" element={<EmpleadoFormPage />} />
          <Route path="/empleados/:id" element={<EmpleadoDetallePage />} />
          <Route path="/empleados/:id/editar" element={<EmpleadoFormPage />} />
          <Route path="/pagos" element={<PagosPage />} />
          <Route path="/checador/mapeo" element={<MapeoChecadorPage />} />
          <Route path="/formatos" element={<FormatosPage />} />
          {rol === 'admin' && <Route path="/tratamientos" element={<TratamientosPage />} />}
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
            <Layout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
