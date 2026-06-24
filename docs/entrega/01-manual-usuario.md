# Gioval — Manual de Usuario

Última actualización: 2026-06-23

Este manual explica cómo usar el sistema día a día. Si necesitas las contraseñas de acceso, pídelas por separado — no están en este documento.

## Acceso al sistema

- **App principal (PC o tablet):** `http://62.238.3.136:8088`
- **App móvil (Android, en campo):** instalar el APK desde `http://62.238.3.136:8089/downloads/gioval.apk`
- **Landing pública (para pacientes/redes sociales):** `http://62.238.3.136:8089`

Inicia sesión con tu correo y contraseña. El sistema cierra sesión automáticamente después de 8 horas por seguridad.

## Roles del sistema

Cada usuario tiene un rol que determina qué puede ver y hacer:

| Rol | Quién | Puede hacer |
|---|---|---|
| **Admin** | Dra. Giovanna | Todo. Es el único que puede borrar registros, editar el catálogo de tratamientos y precios, ver finanzas, gestionar usuarios. |
| **Asistente médico** | Médico de planta | Expediente clínico completo (lectura y escritura), notas SOAP médicas, procedimientos en vivo. |
| **Cosmetista** | Cosmetólogas | Notas cosméticas, expediente en solo lectura, procedimientos en vivo. |
| **Asistente general** | Enfermería / recepción | Datos generales del paciente, check-in de citas, caja. No accede al expediente clínico ni a notas. |

Además, cualquier usuario con el permiso **"puede caja"** activado (independiente de su rol) puede cobrar en el módulo Caja.

## Módulos

### Inicio (Dashboard)
Tarjetas de acceso rápido a cada módulo. Lo que ves depende de tu rol — por ejemplo, Finanzas y Tratamientos solo aparecen para Admin.

### Citas
- **Vista diaria:** una columna por empleada, una fila por hora.
- **Vista semanal:** los 7 días de la semana.
- Crear/editar/eliminar una cita abre un formulario donde buscas al paciente por nombre (autocompletar) o registras uno nuevo rápido (solo apellido, nombre y teléfono).
- La pestaña **"Solicitudes Landing"** (solo Admin) muestra las citas que los pacientes solicitan desde la página pública — hay que confirmarlas manualmente para que se vuelvan citas reales.

### Pacientes y Expediente Clínico
Al abrir un paciente verás varias pestañas:

1. **Historia Clínica** — formulario NOM-004 completo: antecedentes heredofamiliares, antecedentes personales patológicos, medicamentos actuales, antecedentes no patológicos, gineco-obstétricos, motivo de consulta, tratamientos previos, exploración física. Cada sección tiene una casilla "Ninguna" cuando no aplica.
2. **Citas** — historial de citas de ese paciente.
3. **Notas de Visita** — notas tipo SOAP por cada cita, médicas o cosméticas según quién las escribe.
4. **Consentimientos** — aquí aparece un aviso si al paciente le falta firmar el **Aviso de Privacidad (CI-00)** o la **Carta Compromiso (CI-01)** — son obligatorios y se firman una sola vez por paciente, con firma digital en pantalla. Si el tratamiento que va a recibir tiene su propio consentimiento informado, también aparece aquí antes del procedimiento.
5. **Valoraciones y Procedimientos** (solo Admin/Médico) — formularios específicos: valoración facial, corporal, capilar, control de peso, medicina funcional, toxina botulínica, rellenos, bitácoras de sesiones (láser, HIFU, mesoterapia, sueroterapia), interconsultas.
6. **Laboratorios** — subir y consultar resultados de laboratorio (PDF o imagen).
7. Dentro de la pestaña **Citas**, cada cita expandida muestra una galería de fotos del tratamiento (antes/durante/después).

Cuando registras un paciente nuevo, el sistema te lleva directo a la pestaña de Consentimientos para firmar el Aviso de Privacidad y la Carta Compromiso antes de continuar.

### Tratamientos (solo Admin)
Catálogo de ~100 servicios agrupado por categoría. Desde aquí:
- Editas nombre, duración y precio de cada tratamiento (clic en el precio para editarlo).
- Activas/desactivas un tratamiento.
- Asocias o editas el consentimiento informado específico de ese tratamiento (botón "CI").
- Editas los textos del Aviso de Privacidad (CI-00) y la Carta Compromiso (CI-01) — bloque "Consentimientos Generales" arriba de la tabla.

### Procedimientos en Vivo
Vista operativa del día: cada paciente avanza por un pipeline de 7 etapas — **agendada → check-in → en consultorio → en procedimiento → cierre → en caja → completado**. No se puede pasar de "cierre" a "en caja" sin haber guardado la nota de visita. Aquí también se configuran los consultorios/cabinas disponibles (Admin).

### Finanzas (solo Admin/Asistente general)
- **Caja** — cobro rápido del día: marca una cita como cobrada en un clic (efectivo, tarjeta o transferencia).
- **Movimientos** — todos los ingresos/egresos, por categoría.
- **Cortes de Caja** — resumen para cerrar el día.
- **Reportes** — gráficas y exportación a PDF.

### Farmacia (solo Admin por ahora)
- **Inventario** — alta, edición y control de stock de productos.
- **POS (punto de venta)** — buscar producto, armar carrito, cobrar (efectivo, tarjeta o transferencia).
- **Catálogos** — subir listas de precios de proveedores (CSV o PDF) para cargar productos en lote.
- Hay que abrir caja de Farmacia al empezar el turno y cerrarla al terminar.

### Empleados (solo Admin)
Gestión de personal: datos generales, pagos, checador (entradas/salidas), formatos, contratos. También aquí se crean los usuarios del sistema (correo, contraseña inicial, rol) en la sección "Usuarios del sistema".

## Landing page (sitio público)

La landing (`http://62.238.3.136:8089`) es el sitio que ven pacientes potenciales — incluye información de la clínica, catálogo de tratamientos público y un formulario de contacto que genera una "solicitud de cita" (aparece en la pestaña Solicitudes Landing dentro de Citas, para que el equipo la confirme).

**Importante:** la landing es un sitio de código, no tiene un panel de administración propio. Cualquier cambio de texto, fotos o precios visibles ahí requiere que un desarrollador edite el código y vuelva a publicar — no se puede editar desde el navegador.

## App móvil (Android)

Pensada para que cosmetólogas y el médico consulten su día sin estar frente a una computadora:
- **Agenda** — citas del día agrupadas por hora.
- **Detalle de cita** — mismo pipeline de 7 etapas que en la versión de escritorio.
- **Nota** — llenar/editar la nota SOAP de la visita.
- **Paciente** — ver el expediente en modo lectura.

Se instala descargando el APK desde el link de arriba (Android únicamente por ahora — ver documentación técnica para el estado de iOS).

## Dudas o problemas

Para soporte técnico, contactar al desarrollador — ver documentación técnica para detalles de infraestructura y despliegue.
