import { getPresupuesto } from '../api/presupuestos';
import { pesos } from '../utils/presupuesto';
import logoGioval from '../assets/gioval-logo.png';

// Mismo patrón que imprimirReceta (ExpedienteTabs): ventana nueva con HTML y window.print()
export async function imprimirPresupuesto(id) {
  const w = window.open('', '_blank');
  const p = await getPresupuesto(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const filas = p.items.map(i => `
    <tr><td>${esc(i.tratamiento_nombre)}</td>
        <td>${i.sesiones}</td>
        <td>${i.modalidad === 'completo' ? 'Tratamiento completo' : 'Por sesión'}</td>
        <td class="r">${pesos(i.precio_unitario)}</td>
        <td>${i.descuento_pct ? `${esc(i.promocion_nombre)} −${i.descuento_pct}%` : ''}</td>
        <td class="r">${pesos(i.subtotal)}</td></tr>`).join('');
  const fecha = new Date(`${p.fecha}T00:00:00`).toLocaleDateString('es-MX', { dateStyle: 'long' });
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Presupuesto ${p.id} — ${esc(p.paciente_nombre)}</title>
    <style>
      body { font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif; color: #574d5c; padding: 32px; font-size: 11pt; }
      img.logo { height: 56px; } h1 { font-size: 15pt; margin: 16px 0 4px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border-bottom: 1px solid #ced1ca; padding: 6px 4px; text-align: left; } .r { text-align: right; }
      .total td { font-weight: bold; border-bottom: none; font-size: 12pt; }
      .firma img { height: 90px; } .legal { font-size: 9.5pt; margin-top: 12px; }
    </style></head><body>
    <img class="logo" src="${logoGioval}" alt="Gioval" />
    <h1>Presupuesto de tratamiento · Folio ${p.id}</h1>
    <p>Paciente: <strong>${esc(p.paciente_nombre)}</strong> · Fecha: ${fecha}${p.elaboro ? ` · Elaboró: ${esc(p.elaboro)}` : ''}</p>
    <table>
      <thead><tr><th>Tratamiento</th><th>Sesiones</th><th>Modalidad</th><th class="r">Precio por sesión</th><th>Promoción</th><th class="r">Subtotal</th></tr></thead>
      <tbody>${filas}<tr class="total"><td colspan="5">Total</td><td class="r">${pesos(p.total)}</td></tr></tbody>
    </table>
    <p class="legal">Acepto el costo de los tratamientos descritos en este presupuesto. Precios y promociones vigentes al momento de la firma.</p>
    <div class="firma"><img src="${esc(p.firma)}" alt="Firma" /><br/>${esc(p.paciente_nombre)} · firmado ${new Date(p.firmado_at).toLocaleString('es-MX')}</div>
    <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
    </body></html>`);
  w.document.close();
}
