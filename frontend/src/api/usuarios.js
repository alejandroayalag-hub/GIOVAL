// frontend/src/api/usuarios.js
import api from './client';

export const getUsuarios   = ()       => api.get('/usuarios').then(r => r.data);
export const createUsuario = (data)   => api.post('/usuarios', data).then(r => r.data);
export const updateUsuario = (id, d)  => api.put(`/usuarios/${id}`, d).then(r => r.data);
