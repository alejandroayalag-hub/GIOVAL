import api from './client';

export const syncStatus   = ()     => api.get('/sync/status').then(r => r.data);
export const syncPull     = (body) => api.post('/sync/pull', body || {}).then(r => r.data);
export const syncPushAll  = ()     => api.post('/sync/push-all').then(r => r.data);
