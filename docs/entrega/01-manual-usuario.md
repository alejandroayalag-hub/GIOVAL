# Gioval — Manual de Usuario

Última actualización: 2026-06-30

Este manual explica cómo usar el sistema día a día. Las contraseñas de acceso se entregan por separado — no están en este documento.

---

## Acceso al sistema

- **Sistema principal (PC, tablet o iPad):** `http://62.238.3.136:8088`
- **Sitio público (pacientes/redes sociales):** `http://62.238.3.136:8089`

Inicia sesión con tu correo y contraseña. El sistema cierra sesión automáticamente después de 8 horas.

### Instalar en iPad (recomendado para colaboradoras)

1. Abrir **Safari** — no Chrome ni otros navegadores
2. Ir a `http://62.238.3.136:8088`
3. Tocar el ícono **compartir** (cuadrado con flecha ↑) en la barra inferior
4. Seleccionar **"Agregar a pantalla de inicio"**
5. Nombre: `Gioval` → tocar **Agregar**
6. El ícono de Gioval aparece en el homescreen — abre pantalla completa sin barra de navegador

### Primer acceso — colaboradoras

La primera vez que entres con tu cuenta, el sistema te pedirá crear una contraseña personal (mínimo 8 caracteres). Esto ocurre solo una vez. A partir de ahí entras con tu contraseña propia.

---

## Roles del sistema

| Rol | Quién | Puede hacer |
|---|---|---|
| **Admin** | Dra. Giovanna | Todo — único que puede borrar, editar catálogo, ver finanzas completas, gestionar usuarios |
| **Asistente médico** | Médico | Expediente clínico completo, notas SOAP médicas, procedimientos en vivo |
| **Cosmetista** | Cosmetólogas | Notas cosméticas, expediente en lectura, procedimientos en vivo |
| **Asistente general** | Enfermería / recepción | Datos generales de paciente, check-in, caja |

Cualquier usuario con permiso **"puede caja"** activado puede cobrar en el módulo Caja, independientemente de su rol.

---

## Pantalla de bienvenida

Al entrar al sistema aparece una pantalla personalizada con tu nombre y una frase del día. Toca la pantalla o el botón "Continuar" para ir al menú principal. Esta pantalla aparece solo una vez al día.

---

## Módulos

### Inicio (Dashboard)

Tarjetas de acceso rápido a cada módulo. Lo que ves depende de tu rol — Finanzas y Tratamientos solo aparecen para Admin.

---

### Citas

- **Vista diaria:** una columna por empleada, una fila por hora.
- **Vista semanal:** los 7 días de la semana.
- Crear/editar/eliminar una cita: busca al paciente por nombre (autocompletar) o registra uno nuevo rápido (apellido, nombre y teléfono).
- **Pestaña "Solicitudes Landing"** (solo Admin): citas solicitadas desde el sitio público — hay que confirmarlas manualmente para que se vuelvan citas reales.

---

### Pacientes y Expediente Clínico

Al abrir un paciente verás las siguientes pestañas:

1. **Historia Clínica** — formulario NOM-004 completo con 8 secciones:
   - Antecedentes heredofamiliares (AHF)
   - Antecedentes personales patológicos (APP)
   - Medicamentos actuales
   - Antecedentes no patológicos (APNP)
   - Gineco-obstétricos
   - Motivo de consulta (23 objetivos Gioval)
   - Tratamientos previos
   - Exploración física (Fitzpatrick, Glogau, medidas, signos vitales)
   Cada sección tiene casilla "Ninguna" cuando no aplica.

2. **Citas** — historial de citas del paciente.

3. **Notas de Visita** — notas SOAP por cada cita (médicas o cosméticas según quién las escribe).

4. **Consentimientos** — aviso si faltan firmar el **Aviso de Privacidad (CI-00)** o la **Carta Compromiso (CI-01)** — se firman digitalmente una sola vez por paciente. Si el tratamiento tiene su propio consentimiento informado, también aparece aquí antes del procedimiento.

5. **Valoraciones y Procedimientos** (Admin/Médico) — 17 formularios clínicos: valoración facial (VAL-01/01B), corporal (VAL-02), capilar (VAL-03), control de peso (VAL-04), medicina funcional (VAL-05), pre-aparatología/láser (HIST-LAX), toxina botulínica (PROC-01), rellenos HA (PROC-02), skin boosters/mesoterapia (PROC-03), y bitácoras de sesiones: depilación láser, HIFU/Endolift/RF, mesoterapia, control de peso/tirzepatida, sueroterapia, interconsultas.

6. **Laboratorios** — subir y consultar resultados de laboratorio (PDF o imagen).

**Al registrar un paciente nuevo** el sistema te lleva directo a la pestaña de Consentimientos para firmar CI-00 y CI-01 antes de continuar.

---

### Tratamientos (solo Admin)

Catálogo de ~100 servicios agrupado por categoría. Desde aquí:
- Editas nombre, duración y precio de cada tratamiento (clic en el precio para editar).
- Activas/desactivas tratamientos.
- Asocias o editas el consentimiento informado de cada tratamiento (botón "CI").
- Editas los textos de CI-00 y CI-01 en el bloque "Consentimientos Generales".

---

### Procedimientos en Vivo

Vista operativa del día. Cada paciente avanza por un pipeline de 7 etapas:

**agendada → check-in → en consultorio → en procedimiento → cierre → en caja → completado**

- No se puede pasar de "cierre" a "en caja" sin haber guardado la nota de visita SOAP.
- Al cobrar en Caja, el flujo avanza automáticamente a "completado".
- El admin puede configurar las cabinas/consultorios disponibles desde esta misma pantalla.

---

### Finanzas (Admin + Asistente general con permiso)

11 pestañas organizadas en dos grupos:

**Operación diaria:**
- **Caja** — cobro rápido del día: marca citas como cobradas (efectivo, tarjeta o transferencia). Muestra costo de cabina y margen por cita.
- **Movimientos** — todos los ingresos y egresos con categoría.
- **Cortes de Caja** — cierre del día con resumen de totales.
- **Reportes** — gráficas e historial.

**Análisis financiero (solo Admin):**
- **Dashboard KPIs** — 9 indicadores clave del mes (ingresos, margen, ocupación, etc.) con selector de mes.
- **Estado de Resultados** — ingresos / costos / gastos / utilidad neta por mes, exportable.
- **Insumos** — catálogo de 92 productos con stock actual y stock mínimo editable.
- **Kits x Tratamiento** — lista expandible: qué insumos usa cada tratamiento y cuánto cuesta la cabina.
- **Nómina** — registro mensual de sueldos, comisiones y bonos por empleado.
- **Cuentas x Pagar** — facturas de proveedores pendientes con semáforo de vencimiento.
- **Categorías** — alta y edición de categorías de movimientos.

---

### Farmacia (solo Admin)

- **Inventario** — alta, edición y control de stock de productos dermatológicos.
- **POS (punto de venta)** — buscar producto, armar carrito, cobrar (efectivo, tarjeta o transferencia).
- **Catálogos** — subir listas de precios de proveedores (CSV o PDF) para importar productos en lote.
- Hay que **abrir caja de Farmacia** al empezar el turno y cerrarla al terminar.

---

### Empleados (solo Admin)

Gestión de personal: datos generales, pagos, checador (entradas/salidas), formatos y contratos.

En la sección **"Usuarios del sistema"** se crean las cuentas de acceso (correo, contraseña inicial, rol). Todo usuario nuevo deberá cambiar su contraseña en su primer login.

---

## Landing page (sitio público)

El sitio `http://62.238.3.136:8089` es lo que ven los pacientes potenciales — información de la clínica, catálogo de tratamientos y formulario de contacto que genera solicitudes de cita.

**Importante:** la landing no tiene panel de administración. Cualquier cambio de texto, fotos o precios requiere al desarrollador.

---

## Dudas o problemas

Para soporte técnico, contactar al desarrollador — ver documentación técnica para detalles de infraestructura.
