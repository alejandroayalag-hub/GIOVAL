# Elys — Diseño del Sistema
**Fecha:** 2026-06-04
**Cliente:** Dra. Giovanna Valencia
**Tipo:** Clínica de belleza y tratamientos médicos

---

## 1. Resumen del Proyecto

Sistema de gestión para clínica de belleza **Elys**, basado en fork completo de RHATA. Incluye todos los módulos de RH heredados más un nuevo módulo de control de citas con vistas diaria y semanal.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL (Docker) |
| Auth | JWT (8h) |
| Deploy | PM2 + Nginx |

---

## 3. Infraestructura

| Parámetro | Valor |
|-----------|-------|
| Carpeta | `~/elys/` |
| Backend puerto | **3008** |
| PostgreSQL puerto | **5439** |
| Nginx (prod) | **8088** |
| DB name | `elys` |
| DB user | `elys_user` |
| DB pass | `elys_pass` |

---

## 4. Branding

| # | HEX | Nombre | Uso |
|---|-----|--------|-----|
| 1 | `#cccad8` | Lavanda claro | Color primario, navbar |
| 2 | `#aba3ba` | Lila medio | Botones, acentos |
| 3 | `#887482` | Malva oscuro | Texto secundario |
| 4 | `#ced1ca` | Gris sage | Fondos secundarios |
| 5 | `#f5f2f0` | Crema | Fondo principal |

Tipografía y logo: por definir (brandbook GIOVAL).

---

## 5. Roles y Permisos

| Rol | Descripción | Restricciones |
|-----|-------------|---------------|
| `admin` | Dra. Giovanna Valencia | Sin restricciones — CRUD completo |
| `asistente` | Personal de recepción | Puede crear y editar citas; **no puede borrar citas con estatus "realizada"** |

---

## 6. Módulos Heredados de RHATA

Los siguientes módulos se heredan sin cambios estructurales. Solo se adaptan colores, nombre del sistema y logo.

- **Empleados** — expediente completo, foto de perfil, documentos (17 tipos), formatos descargables
- **Checador** — mapeo de UIDs, registro de checadas
- **Pagos** — importar PDF semanal Banco Bajío, historial por empleado
- **Formatos** — 6 tipos de PDF descargables
- **Auth** — JWT 8h, login con email + password

> El módulo de pagos (Banco Bajío) se hereda pero puede ocultarse del menú si no aplica para Elys.

---

## 7. Módulo de Citas (Nuevo)

### 7.1 Entidades de Base de Datos

**`tratamientos`**
```
id             SERIAL PRIMARY KEY
nombre         VARCHAR(150) NOT NULL
duracion_min   INTEGER               -- duración estimada en minutos
activo         BOOLEAN DEFAULT true
created_at     TIMESTAMP DEFAULT NOW()
```

**`citas`**
```
id                  SERIAL PRIMARY KEY
nombre_paciente     VARCHAR(200) NOT NULL
telefono            VARCHAR(20)
tratamiento_id      INTEGER REFERENCES tratamientos(id)
empleada_id         INTEGER REFERENCES empleados(id)
fecha_hora          TIMESTAMP NOT NULL
notas               TEXT
estatus             VARCHAR(20) DEFAULT 'pendiente'
                    -- valores: pendiente | realizada | cancelada
created_by          INTEGER REFERENCES usuarios(id)
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

### 7.2 Reglas de Negocio

- Solo `admin` puede eliminar citas con estatus `realizada`.
- `asistente` puede crear y editar cualquier cita, y cancelar citas `pendiente`.
- Una cita marcada como `realizada` es inmutable para el rol `asistente`.
- El catálogo de tratamientos solo lo gestiona `admin`.

### 7.3 Vistas del Calendario

**Vista diaria:**
- Eje vertical: horas del día (ej. 08:00 – 20:00)
- Eje horizontal: columna por empleada
- Bloques de color por tratamiento
- Click en hueco → modal nueva cita
- Click en bloque → modal detalle/editar

**Vista semanal:**
- 7 columnas (lunes a domingo)
- Citas como bloques de color por tratamiento
- Click en bloque → modal detalle/editar
- Navegación: semana anterior / siguiente

### 7.4 Modal de Cita

Campos:
- Nombre del paciente (texto libre)
- Teléfono
- Tratamiento (select del catálogo)
- Fecha y hora
- Empleada que atiende (select de empleados activos)
- Notas (textarea)
- Estatus (pendiente / realizada / cancelada)

### 7.5 Rutas Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/citas` | Lista citas (filtro por fecha/rango) |
| POST | `/api/citas` | Crear cita |
| PUT | `/api/citas/:id` | Editar cita |
| DELETE | `/api/citas/:id` | Eliminar cita (solo admin si estatus=realizada) |
| GET | `/api/tratamientos` | Lista catálogo |
| POST | `/api/tratamientos` | Crear tratamiento (solo admin) |
| PUT | `/api/tratamientos/:id` | Editar tratamiento (solo admin) |

---

## 8. Migraciones de Base de Datos

Siguiendo el patrón de RHATA (`src/db/migrations/`):

- `001_init.sql` — tablas base heredadas (usuarios, empleados, documentos, etc.)
- `002_citas.sql` — tablas `tratamientos` y `citas`
- `003_seed_tratamientos.sql` — catálogo inicial de tratamientos ejemplo

---

## 9. Estructura de Carpetas

```
~/elys/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── citasController.js
│   │   │   └── tratamientosController.js
│   │   ├── db/
│   │   │   └── migrations/
│   │   ├── models/
│   │   ├── routes/
│   │   └── index.js
│   └── .env
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── CitasPage.jsx        ← calendario principal
│       │   └── TratamientosPage.jsx ← catálogo admin
│       └── components/
│           ├── CalendarioDia.jsx
│           ├── CalendarioSemana.jsx
│           └── CitaModal.jsx
├── docker-compose.yml
├── deploy.sh
└── docs/
    └── superpowers/specs/
        └── 2026-06-04-elys-design.md
```

---

## 10. Deploy

Mismo patrón que RHATA:
- `deploy.sh` con rsync excluyendo `uploads/`
- PM2 proceso: `elys-backend`
- Nginx en puerto **8088** → backend **3008**
- PostgreSQL Docker en puerto **5439**
- `client_max_body_size 25M` en nginx

---

## 11. Credenciales Iniciales

| Campo | Valor |
|-------|-------|
| Admin email | `admin@elys.com` |
| Admin password | `Admin123!` |
| DB name | `elys` |
| DB user | `elys_user` |
| DB pass | `elys_pass` |
