// Express 5: req.query es un getter que re-parsea la URL en cada acceso, así que
// borrar claves no persiste. Redefinimos req.query como propiedad propia con los
// params vacíos ('') quitados, para que columnas date/integer no reciban '' → 500.
module.exports = function normalizeQuery(req, res, next) {
  const q = { ...req.query };
  for (const k in q) {
    if (q[k] === '') delete q[k];
  }
  Object.defineProperty(req, 'query', { value: q, configurable: true, writable: true });
  next();
};
