import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Sparkles, UserRound, DollarSign, Activity, Package } from 'lucide-react';
import logoGioval from '../assets/gioval-logo.png';

const modulos = [
  {
    key: 'citas',
    label: 'Citas',
    desc: 'Agenda diaria y semanal, nueva cita, historial de pacientes',
    to: '/citas',
    Icon: Calendar,
    from: '#887482',
    to_color: '#aba3ba',
    shadow: 'rgba(136,116,130,0.25)',
  },
  {
    key: 'pacientes',
    label: 'Pacientes',
    desc: 'Expedientes clínicos, historia y notas de visita',
    to: '/pacientes',
    Icon: UserRound,
    from: '#9a98b8',
    to_color: '#cccad8',
    shadow: 'rgba(154,152,184,0.25)',
  },
  {
    key: 'empleados',
    label: 'Empleados',
    desc: 'Expedientes, pagos, checador, formatos y control de personal',
    to: '/empleados',
    Icon: Users,
    from: '#a0b8a8',
    to_color: '#ced1ca',
    shadow: 'rgba(160,184,168,0.25)',
  },
  {
    key: 'tratamientos',
    label: 'Tratamientos',
    desc: 'Catálogo de servicios, duración y estado',
    to: '/tratamientos',
    Icon: Sparkles,
    from: '#6a5462',
    to_color: '#887482',
    shadow: 'rgba(106,84,98,0.25)',
    adminOnly: true,
  },
  {
    key: 'finanzas',
    label: 'Finanzas',
    desc: 'Ingresos, egresos y cortes de caja',
    to: '/finanzas',
    Icon: DollarSign,
    from: '#4a7c6a',
    to_color: '#7ab89a',
    shadow: 'rgba(74,124,106,0.25)',
    adminOnly: true,
  },
  {
    key: 'procedimientos',
    label: 'En vivo',
    desc: 'Seguimiento del flujo de pacientes en tiempo real',
    to: '/procedimientos',
    Icon: Activity,
    from: '#7a6ab0',
    to_color: '#aba3ba',
    shadow: 'rgba(122,106,176,0.25)',
  },
  {
    key: 'farmacia',
    label: 'Farmacia',
    desc: 'Inventario, punto de venta y reportes',
    to: '/farmacia',
    Icon: Package,
    from: '#8b6f47',
    to_color: '#c4a876',
    shadow: 'rgba(139,111,71,0.25)',
    adminOnly: true,
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const rol = localStorage.getItem('rol');

  const visibles = modulos.filter(m => !m.adminOnly || rol === 'admin');

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-8">

      {/* Logo + subtítulo */}
      <div className="text-center mb-12">
        <img src={logoGioval} alt="gioval · Medicina Estética"
             className="h-20 object-contain mx-auto mb-5 drop-shadow-sm" />
        <p className="text-sm font-medium tracking-wide"
           style={{ color: 'var(--color-dark)', opacity: 0.55 }}>
          Selecciona un módulo para continuar
        </p>
      </div>

      {/* Grid de módulos */}
      <div className={`grid gap-5 w-full max-w-5xl px-4 ${
        visibles.length <= 4
          ? 'grid-cols-2 md:grid-cols-4'
          : 'grid-cols-2 md:grid-cols-3'
      }`}>
        {visibles.map(m => (
          <button
            key={m.key}
            onClick={() => navigate(m.to)}
            className="bg-white rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-2 hover:shadow-xl active:scale-95 border"
            style={{
              borderColor: 'var(--color-sage)',
              boxShadow: `0 4px 16px ${m.shadow}`,
            }}
          >
            {/* Icono con gradiente de paleta GIOVAL */}
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-md"
              style={{ background: `linear-gradient(135deg, ${m.from}, ${m.to_color})` }}
            >
              <m.Icon className="w-7 h-7 text-white" strokeWidth={1.6} />
            </div>

            <h2 className="text-base font-semibold mb-1.5" style={{ color: 'var(--color-dark)' }}>
              {m.label}
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-accent)' }}>
              {m.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
