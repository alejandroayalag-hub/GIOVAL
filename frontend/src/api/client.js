import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Finanzas por empresa (Giovanna PF / Elys PM): los GET de finanzas se filtran por la vista elegida
  const empresa = localStorage.getItem('finanzasEmpresa');
  if (config.method === 'get' && empresa && empresa !== 'todas' && window.location.pathname.startsWith('/finanzas')
      && /^\/(movimientos|caja|cortes-caja|finanzas|finanzas-farmacia|nomina|cuentas-por-pagar)(\/|$)/.test(config.url)) {
    config.params = { empresa, ...config.params };
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('nombre');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
