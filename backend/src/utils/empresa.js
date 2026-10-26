// Dos razones sociales en Finanzas: Giovanna (persona física) y Elys (persona moral).
const EMPRESAS = ['giovanna', 'elys'];

// Lectura: ?empresa=giovanna|elys filtra; ausente o 'todas' = consolidado (null).
const filtroEmpresa = (query) => (EMPRESAS.includes(query?.empresa) ? query.empresa : null);

// Escritura: si no viene (app móvil, anticipos en línea) queda en Giovanna; si viene inválida, 400.
function empresaEscritura(valor) {
  if (valor == null || valor === '') return 'giovanna';
  if (!EMPRESAS.includes(valor)) throw Object.assign(new Error('Empresa inválida (giovanna | elys)'), { status: 400 });
  return valor;
}

module.exports = { EMPRESAS, filtroEmpresa, empresaEscritura };
