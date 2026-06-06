import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCitas } from '../api/citas';
import { getEmpleados } from '../api/empleados';
import logoGioval from '../assets/gioval-logo.png';
import badgeGioval from '../assets/gioval-badge.png';
import gvGioval from '../assets/gioval-gv.png';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border flex flex-col gap-1"
         style={{ borderColor: 'var(--color-sage)' }}>
      <div className="text-3xl font-bold" style={{ color: color || 'var(--color-dark)' }}>
        {value ?? '—'}
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--color-dark)' }}>{label}</div>
      {sub && <div className="text-xs" style={{ color: 'var(--color-accent)' }}>{sub}</div>}
    </div>
  );
}

function QuickLink({ to, icon, label }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)}
            className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3 hover:shadow-md transition-shadow text-left w-full"
            style={{ borderColor: 'var(--color-sage)' }}>
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--color-dark)' }}>{label}</span>
    </button>
  );
}

export default function DashboardPage() {
  const nombre = localStorage.getItem('nombre');
  const rol = localStorage.getItem('rol');
  const [citasHoy, setCitasHoy] = useState(null);
  const [citasSemana, setCitasSemana] = useState(null);
  const [empleados, setEmpleados] = useState(null);
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    const fecha = new Date().toLocaleDateString('sv-SE');
    getCitas({ fecha }).then(d => setCitasHoy(d.length)).catch(() => setCitasHoy(0));

    const hoy = new Date();
    const dia = hoy.getDay() || 7;
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - dia + 1);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    const desde = lunes.toLocaleDateString('sv-SE');
    const hasta = domingo.toLocaleDateString('sv-SE');
    getCitas({ desde, hasta }).then(d => setCitasSemana(d.length)).catch(() => setCitasSemana(0));

    getEmpleados().then(d => setEmpleados(d.filter(e => e.estatus === 'activo').length)).catch(() => setEmpleados(0));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 flex items-center justify-between px-10 py-8"
           style={{ backgroundColor: 'var(--color-primary)', minHeight: 160 }}>
        {/* Logo principal */}
        <img src={logoGioval} alt="gioval" className="h-16 object-contain" style={{ filter: 'brightness(0) invert(1) opacity(0.9)' }} />

        {/* Saludo */}
        <div className="flex flex-col items-center text-center flex-1 px-8">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-dark)', opacity: 0.65 }}>
            Bienvenida
          </p>
          <p className="font-semibold text-lg" style={{ color: 'var(--color-dark)' }}>{nombre}</p>
          <p className="text-xs capitalize mt-1" style={{ color: 'var(--color-dark)', opacity: 0.55 }}>{today}</p>
        </div>

        {/* Badge decorativo */}
        <img src={badgeGioval} alt="" className="h-20 object-contain opacity-25" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Citas hoy" value={citasHoy} sub="agendadas para hoy" color="var(--color-dark)" />
        <StatCard label="Citas esta semana" value={citasSemana} sub="lunes a domingo" color="var(--color-accent)" />
        <StatCard label="Empleadas activas" value={empleados} sub="en el sistema" color="var(--color-sage-dark, #7a9e8a)" />
      </div>

      {/* Accesos rápidos */}
      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--color-dark)', opacity: 0.6 }}>
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickLink to="/citas" icon="📅" label="Ver agenda" />
          <QuickLink to="/citas" icon="＋" label="Nueva cita" />
          <QuickLink to="/" icon="👥" label="Empleadas" />
          {rol === 'admin' && <QuickLink to="/tratamientos" icon="✦" label="Tratamientos" />}
        </div>
      </div>

      {/* Marca decorativa */}
      <div className="flex justify-end mt-10 opacity-10">
        <img src={gvGioval} alt="" className="h-32 object-contain" />
      </div>
    </div>
  );
}
