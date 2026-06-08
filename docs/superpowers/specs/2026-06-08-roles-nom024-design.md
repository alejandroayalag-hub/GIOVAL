# Módulo de Roles NOM-024 — Gioval Medicina Estética

**Fecha:** 2026-06-08
**Proyecto:** Elys / Gioval Medicina Estética
**Estado:** Aprobado por usuario
**Norma:** NOM-024-SSA3-2012 — Sección 2 (Control de Acceso)

---

## Resumen

Implementación de 4 roles diferenciados con permisos granulares para cumplir el numeral 6.6.3 y 6.6.4 de la NOM-024-SSA3-2012. Reemplaza el esquema actual de 2 roles (`admin` / `asistente`) con un modelo de 4 roles que refleja la estructura real de Clínica Gioval.

---

## Decisiones de diseño

| Pregunta | Decisión |
|---|---|
| ¿Cómo se almacenan los roles? | Extender el campo `rol` existente en `usuarios` (Opción A) |
| ¿Cómo se aplican permisos en backend? | Middleware `requireRol(...roles)` por ruta |
| ¿Cómo se aplican en frontend? | Condicionales basados en `rol` del localStorage |
| ¿Restricción de campos HC? | Backend valida qué secciones puede actualizar cada rol |
| ¿Notas de cosmetista? | Campo `tipo` en `notas_visita`: `'medico'` | `'cosmetico'` |

---

## Roles

| Rol | Persona | Descripción |
|---|---|---|
| `admin` | Dra. Giovanna | Responsable médico y administradora. Acceso total: crear, editar y borrar todo. |
| `asistente_medico` | Asistente médico | Puede escribir signos vitales, peso/medidas, motivo de consulta y notas de visita. No puede borrar ningún registro. |
| `cosmetista` | Cosmetista | Solo puede agregar notas de tratamientos cosméticos (qué se realizó + observaciones). No puede borrar. |
| `asistente_general` | Asistente general | Solo puede actualizar datos generales del paciente (identificación, contacto, domicilio). |

---

## Matriz de acceso por módulo

| Módulo | admin | asistente_medico | cosmetista | asistente_general |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Citas | CRUD completo | Ver + crear | Solo ver | Ver + crear |
| Pacientes — lista | CRUD | Ver | Ver | Ver |
| Pacientes — datos generales | CRUD | Solo ver | Solo ver | **Solo editar** |
| HC — Exploración física (signos vitales, peso, medidas) | CRUD | **Solo editar** | Solo ver | Solo ver |
| HC — Motivo de consulta | CRUD | **Solo editar** | Solo ver | Solo ver |
| HC — Otras secciones (AHF, APP, medicamentos, APNP, gineco, tratamientos previos) | CRUD | Solo ver | Solo ver | Solo ver |
| Notas de visita tipo `medico` | CRUD | Crear/editar (no borrar) | Solo ver | No |
| Notas de visita tipo `cosmetico` | CRUD | Solo ver | **Crear/editar** (no borrar) | No |
| Consentimientos | CRUD | Solo ver | Solo ver | No |
| Empleados | ✅ | No | No | No |
| Tratamientos | CRUD | Solo ver | Solo ver | No |
| Finanzas | ✅ | No | No | No |

---

## Base de datos — Migración 017

```sql
-- 1. Actualizar CHECK constraint de roles en usuarios
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'asistente_medico', 'cosmetista', 'asistente_general'));

-- 2. Cédula profesional (NOM-024 — requerida para médicos firmantes)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cedula_profesional VARCHAR(20);

-- 3. Tipo de nota de visita
ALTER TABLE notas_visita ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'medico'
  CHECK (tipo IN ('medico', 'cosmetico'));

-- 4. Migrar usuarios existentes: 'asistente' → 'asistente_medico'
UPDATE usuarios SET rol = 'asistente_medico' WHERE rol = 'asistente';
```

---

## Backend

### Middleware `requireRol`

Nuevo archivo `src/middleware/roles.js`:

```js
// Reemplaza soloAdmin en routes que lo usan
const requireRol = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol))
    return res.status(403).json({ error: 'Sin permisos' });
  next();
};

module.exports = { requireRol };
```

### Restricciones por ruta

| Ruta | Método | Quién puede |
|---|---|---|
| DELETE cualquier recurso | DELETE | solo `admin` |
| `/api/pacientes/:id` (datos generales) | PUT | `admin`, `asistente_general` |
| `/api/historias-clinicas/:id` (secciones exploración + motivo) | PUT | `admin`, `asistente_medico` |
| `/api/historias-clinicas/:id` (otras secciones) | PUT | solo `admin` |
| `/api/notas-visita` | POST/PUT | `admin`, `asistente_medico`, `cosmetista` |
| DELETE `/api/notas-visita/:id` | DELETE | solo `admin` |
| `/api/empleados`, `/api/finanzas/*` | todos | solo `admin` |
| `/api/citas` | POST/PUT | `admin`, `asistente_medico`, `asistente_general` |
| DELETE `/api/citas/:id` | DELETE | solo `admin` |

### Validación de campos HC por rol

En el controller de `historias-clinicas`, el PUT valida el `rol` del usuario:

- `asistente_medico`: solo puede enviar campos de las secciones `exploracion_fisica` y `motivo_consulta`. Cualquier otro campo en el body es ignorado (no da error, solo se filtra).
- `admin`: puede enviar cualquier campo.

### Notas de visita — tipo

- Al crear nota, el campo `tipo` se fuerza según el rol:
  - `asistente_medico` → siempre `'medico'`
  - `cosmetista` → siempre `'cosmetico'`
  - `admin` → acepta cualquiera, default `'medico'`
- `cosmetista` no puede ver ni editar notas tipo `'medico'`.

---

## Frontend

### Cambios en nav y páginas

- `Empleados` en nav: solo visible para `admin`
- `Finanzas` en nav: solo visible para `admin`
- `Tratamientos` en nav: visible para `admin`, `asistente_medico`, `cosmetista`

### Historia Clínica — botones editar por sección

| Sección | admin | asistente_medico | cosmetista | asistente_general |
|---|---|---|---|---|
| Exploración física | ✅ Editar | ✅ Editar | 🔒 Solo ver | 🔒 Solo ver |
| Motivo de consulta | ✅ Editar | ✅ Editar | 🔒 Solo ver | 🔒 Solo ver |
| AHF, APP, Medicamentos, APNP, Gineco, Tratamientos previos | ✅ Editar | 🔒 Solo ver | 🔒 Solo ver | 🔒 Solo ver |

### Datos generales del paciente

- Botón "Editar datos" visible para `admin` y `asistente_general`
- Oculto para `asistente_medico` y `cosmetista`

### Notas de visita

- Tab "Notas de Visita" visible para `admin`, `asistente_medico`, `cosmetista`
- `asistente_medico`: botón "Nueva nota", chip de tipo `medico` fijo, sin botón borrar
- `cosmetista`: botón "Nueva nota cosmética", solo ve/crea notas tipo `cosmetico`, sin botón borrar
- `admin`: ve todas las notas, puede borrar
- Chips de color diferente: `medico` → malva, `cosmetico` → verde sage

### Gestión de usuarios (panel admin en Empleados)

Nueva sección "Usuarios del sistema" al final de `EmpleadosPage`, visible solo para `admin`:

- Tabla: nombre, email, rol (chip de color), cédula profesional
- Botón "Nuevo usuario" → modal con: nombre, email, contraseña, rol (select), cédula (si rol = admin o asistente_medico)
- Botón editar por fila (no eliminar usuarios)
- El rol `admin` no puede ser asignado desde este panel (solo existe la Dra. Giovanna)

---

## Archivos a crear/modificar

### Backend
- `src/db/migrations/017_roles_nom024.sql` — migración
- `src/middleware/roles.js` — nuevo middleware `requireRol`
- `src/routes/pacientes.js` — aplicar `requireRol` en PUT y DELETE
- `src/routes/historias-clinicas.js` — aplicar `requireRol`, filtrar campos por rol
- `src/routes/notas-visita.js` — aplicar `requireRol`, forzar tipo por rol
- `src/routes/citas.js` — aplicar `requireRol` en DELETE
- `src/routes/empleados.js` — agregar sub-ruta `/usuarios` para gestión
- `src/controllers/historias-clinicas.js` — filtro de campos por rol
- `src/controllers/notasVisita.js` — forzar tipo según rol
- `src/controllers/usuariosController.js` — CRUD de usuarios (nuevo)

### Frontend
- `src/pages/EmpleadosPage.jsx` — agregar sección "Usuarios del sistema"
- `src/components/usuarios/UsuarioModal.jsx` — modal crear/editar usuario (nuevo)
- `src/pages/PacienteDetallePage.jsx` — condicionales de edición por sección HC
- `src/components/notas/NotaVisitaModal.jsx` — tipo de nota según rol
- `src/App.jsx` — ajustar visibilidad de nav items
- `src/api/usuarios.js` — endpoints de gestión de usuarios (nuevo)

---

## Restricciones y reglas de negocio

1. El rol `admin` solo puede ser asignado manualmente en DB — no desde el panel UI
2. `asistente_general` no tiene acceso a ninguna información clínica
3. `cosmetista` no puede ver diagnósticos ni historia clínica médica
4. Nadie excepto `admin` puede borrar registros
5. Los campos que un rol no puede editar en HC se filtran silenciosamente en backend (no error 403, solo se ignoran)
6. La cédula profesional es requerida para roles `admin` y `asistente_medico` (validación soft — alerta pero no bloquea)
