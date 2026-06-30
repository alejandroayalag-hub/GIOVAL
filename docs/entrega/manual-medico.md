# Gioval — Manual Médico

Última actualización: 2026-06-30

---

## Acceso

- **iPad o PC:** `http://62.238.3.136:8088`
- Tu cuenta accede a: Citas, Pacientes (lectura + Historia Clínica + Valoraciones), Procedimientos en Vivo, Tratamientos (lectura)

**Primer acceso:** el sistema te pedirá crear tu propia contraseña (mínimo 8 caracteres). Solo ocurre la primera vez.

---

## Tu flujo de trabajo

### 1. Revisar la agenda

**Citas** → vista diaria → revisa los pacientes del día.

### 2. Procedimientos en Vivo

Puedes avanzar las etapas del pipeline de cada paciente:

| Etapa | Qué significa |
|---|---|
| En consultorio | Paciente en cabina |
| En procedimiento | Tratamiento iniciado |
| Cierre | Tratamiento terminado — **guarda la nota antes de continuar** |

### 3. Nota médica (SOAP)

Antes de pasar de "Cierre" a "En caja" debes guardar la nota:
- Abre la cita → pestaña "Notas de visita" → "Nueva nota"
- Tipo de nota: **médica**
- Guardar

### 4. Historia Clínica

Tienes acceso completo de lectura. Puedes editar:
- **Sección 6 — Motivo de consulta** (y 23 objetivos Gioval)
- **Sección 8 — Exploración física** (signos vitales, Fitzpatrick, Glogau, medidas)

Las otras secciones las edita solo la Dra. Giovanna.

### 5. Valoraciones y Procedimientos

En el expediente del paciente → pestaña "Valoraciones y Procedimientos":

| Código | Formulario |
|---|---|
| VAL-01 / 01B | Valoración estética facial + análisis de piel |
| VAL-02 | Valoración corporal y bioimpedancia |
| VAL-03 | Valoración capilar |
| VAL-04 | Control de peso |
| VAL-05 | Medicina funcional/regenerativa |
| HIST-LAX | Pre-aparatología/láser |
| PROC-01 | Toxina botulínica |
| PROC-02 | Rellenos HA / armonización |
| PROC-03 | Skin boosters / mesoterapia / bioestimuladores |
| BIT-01 a 05 | Bitácoras de sesiones (láser, HIFU, mesoterapia, peso, sueroterapia) |
| INT-01 / 02 | Interconsultas (solicitud y respuesta) |

### 6. Laboratorios

Expediente del paciente → pestaña "Laboratorios" → subir PDF o imagen de resultados.

---

## Lo que NO puedes hacer

- Borrar registros
- Editar precios o tratamientos
- Ver Finanzas
- Gestionar empleados o usuarios
- Editar secciones 1-5 y 7 de la Historia Clínica (esas las edita solo la Dra.)

---

## Dudas frecuentes

**¿No me deja avanzar de "Cierre" a "En caja"?**
Falta la nota SOAP médica. Guárdala en Notas de visita y regresa a Procedimientos en Vivo.

**¿No puedo editar un campo de la Historia Clínica?**
Solo las secciones 6 y 8 son editables para tu rol. El resto requiere la cuenta de la Dra.
