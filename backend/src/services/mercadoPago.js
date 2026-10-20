// MercadoPago Checkout Pro para anticipos de la agenda en línea.
// Sin MP_ACCESS_TOKEN todo funciona igual, pero el anticipo lo registra recepción a mano.
const { MercadoPagoConfig, Preference, Payment, PaymentRefund } = require('mercadopago');

const isConfigured = () => !!process.env.MP_ACCESS_TOKEN;
const client = () => new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

const LANDING_URL = () => process.env.LANDING_URL || 'https://www.gioval.mx';
const BACKEND_URL = () => process.env.BACKEND_URL || 'https://app.gioval.mx';

async function crearPreferencia({ token, titulo, monto, email, minutos }) {
  const vence = new Date(Date.now() + minutos * 60000).toISOString();
  const pref = await new Preference(client()).create({
    body: {
      items: [{ id: token, title: titulo, quantity: 1, unit_price: Number(monto), currency_id: 'MXN' }],
      payer: email ? { email } : undefined,
      external_reference: token,
      back_urls: {
        success: `${LANDING_URL()}/mi-cita/${token}?pago=ok`,
        failure: `${LANDING_URL()}/mi-cita/${token}?pago=error`,
        pending: `${LANDING_URL()}/mi-cita/${token}?pago=pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${BACKEND_URL()}/api/public/agenda/mp/webhook`,
      // Solo pagos inmediatos: OXXO/cajero tardan días y el horario se libera a los 30 min
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
      expires: true,
      expiration_date_to: vence,
      statement_descriptor: 'GIOVAL',
    },
  });
  return pref.init_point;
}

const obtenerPago = id => new Payment(client()).get({ id });
const devolver = paymentId => new PaymentRefund(client()).create({ payment_id: paymentId });

module.exports = { isConfigured, crearPreferencia, obtenerPago, devolver };
