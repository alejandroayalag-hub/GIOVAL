import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('nombre', data.nombre);
      localStorage.setItem('rol', data.rol);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
               style={{ backgroundColor: 'var(--color-primary)' }}>
            <span className="text-2xl font-bold" style={{ color: 'var(--color-dark)' }}>E</span>
          </div>
          <h1 className="font-bold text-xl tracking-wide" style={{ color: 'var(--color-dark)' }}>Elys</h1>
          <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">Clínica de Belleza</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-primary)' }}
              placeholder="admin@elys.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-primary)' }}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
