function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const status = err.status || 500;
  // Errores de sistema/DB (pg SQLSTATE, node ENOENT, etc.) traen err.code y
  // pueden filtrar esquema/rutas → mensaje genérico. Validaciones de negocio
  // (throw new Error('Stock insuficiente')) no traen code → se muestran.
  const leaks = status >= 500 && err.code;
  const message = leaks ? 'Error interno del servidor' : (err.message || 'Error');
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
