import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoGioval from '../assets/gioval-logo.png';

export default function CambiarPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Mínimo 8 caracteres');
    if (password !== confirmar) return setError('Las contraseñas no coinciden');

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/auth/cambiar-password', { password }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.removeItem('debe_cambiar_password');
      navigate('/bienvenida');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="bg-white rounded-2xl shadow-sm p-10 w-full max-w-sm" style={{ border: '1px solid var(--color-primary)' }}>
        <div className="flex flex-col items-center mb-8">
          <img src={logoGioval} alt="Gioval" className="w-56 object-contain mb-6" />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-dark)' }}>
            Crea tu contraseña
          </h1>
          <p className="text-sm text-center mt-1" style={{ color: 'var(--color-accent)' }}>
            Por seguridad, elige una contraseña personal para tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-dark)' }}>
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
              style={{ borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-cream)' }}
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-dark)' }}>
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
              style={{ borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-cream)' }}
              placeholder="Repite la contraseña"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
