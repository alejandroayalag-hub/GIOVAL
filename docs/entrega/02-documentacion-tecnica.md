# Gioval / Elys — Documentación Técnica de Entrega

Última actualización: 2026-06-23

Este documento es para quien dé mantenimiento o continúe el desarrollo del sistema. Cubre arquitectura, infraestructura, despliegue y decisiones técnicas que no son obvias leyendo solo el código.

## 1. Arquitectura general

El ecosistema Gioval son 4 repositorios independientes que comparten el mismo backend (Elys) y el mismo servidor:

```
┌─────────────────────────────────────────────────────────────┐
│  Servidor Hetzner 62.238.3.136                               │
│                                                               │
│  Nginx :8088 ──► PM2 "elys-backend" (Node/Express, :3008)    │
│                       │                                       │
│                       └──► PostgreSQL (Docker, :5439)         │
│                                                               │
│  Nginx :8089 ──► gioval-landing/dist (estático)               │
│       └─ /api/public/* ──► proxy a backend :3008             │
└─────────────────────────────────────────────────────────────┘

Apps móviles (independientes, consumen la misma API :8088/api):
  elys-movil    → APK Android en producción, config iOS lista sin probar
  gioval-mobile → scaffold iOS de 18 pantallas/5 roles, EN PAUSA
```

| Repo | Qué es | Estado |
|---|---|---|
| `~/elys` | App web principal: backend Express + frontend React. Todo el negocio vive aquí. | ✅ Producción |
| `~/gioval-landing` | Landing pública (marketing, captación de leads). | ✅ Producción |
| `~/elys-movil` | App móvil Android (Expo) para cosmetólogas/médico en campo. | ✅ Producción (Android). iOS configurado, sin probar en dispositivo real |
| `~/elys/gioval-mobile` | Scaffold de una app más ambiciosa (5 roles, 18 pantallas, cámara, biometría). | ⏸️ En pausa — ver sección 8 |

## 2. Stack técnico

**Backend (`~/elys/backend`):** Node.js + Express 5, PostgreSQL 16 (driver `pg`, sin ORM), JWT (expira 8h), Multer (uploads de fotos/PDFs).

**Frontend (`~/elys/frontend`):** React 19 + Vite 8, Tailwind CSS v4, axios, recharts (gráficas de finanzas), jsPDF + html2canvas (reportes PDF).

**Landing (`~/gioval-landing`):** Vite + React, Tailwind v4, react-router-dom, sitio estático (sin backend propio — usa la API de Elys vía proxy de Nginx para el formulario de contacto).

**Móvil (`~/elys-movil`):** Expo SDK 56, React Native 0.85.3, React Navigation (stack + bottom tabs), `@react-native-async-storage/async-storage` v2.x.

No hay framework de testing instalado en ninguno de los repos. La verificación se hace con scripts puntuales (`assert`) en el backend y `npm run build` + prueba manual en el frontend.

## 3. Infraestructura y accesos

| Recurso | Valor |
|---|---|
| Servidor | Hetzner, IP `62.238.3.136`, usuario `root` |
| Acceso SSH | Ver anexo de credenciales (no en este documento) |
| Backend Elys | Puerto **3008**, proceso PM2 `elys-backend` |
| Nginx — app Elys | Puerto **8088** → `http://62.238.3.136:8088` |
| Nginx — landing | Puerto **8089** → `http://62.238.3.136:8089` |
| PostgreSQL | Docker, puerto **5439**, DB `elys`, user `elys_user` |
| Uploads (fotos, PDFs) | `backend/uploads/` en el servidor — **no se borra en deploy** (excluido del rsync) |
| APK Android | `http://62.238.3.136:8089/downloads/gioval.apk` |

El servidor `62.238.3.136` es compartido con otros proyectos del mismo operador (Rondines/ATA) — no es exclusivo de Gioval. Cada proyecto corre en su propio puerto/proceso PM2, no se pisan entre sí.

## 4. Despliegue

Cada repo tiene su propio `deploy.sh` en la raíz. Todos siguen el mismo patrón: build del frontend localmente → `rsync` al servidor → reinstalar dependencias → reiniciar PM2.

```bash
# App principal
cd ~/elys && ./deploy.sh

# Landing
cd ~/gioval-landing && ./deploy.sh
```

**Importante:** `deploy.sh` hace `rsync -az --delete` del directorio completo (no de un commit de git específico) — sincroniza exactamente lo que hay en el working directory local, comiteado o no. Por eso es crítico mantener el working directory limpio y reflejado en git (ver sección 7).

**App móvil (APK):**
```bash
cd ~/elys-movil
EXPO_TOKEN=<token> eas build --platform android --profile preview --clear-cache --non-interactive
# subir el .apk resultante a /var/www/downloads/gioval.apk en el servidor
```

## 5. Base de datos

Las migraciones viven en `backend/src/db/migrations/` y se aplican automáticamente al arrancar el backend (`runMigrations()` en `src/index.js`) — no requieren un paso manual. Son 29 migraciones a la fecha, numeradas en orden (001 a 029); cada una agrega tablas/columnas de un módulo específico (citas, pacientes, historia clínica, consentimientos, finanzas, roles, caja, procedimientos en vivo, documentos clínicos, farmacia, etc.).

Para agregar un módulo nuevo: crear `NNN_nombre_descriptivo.sql` con el siguiente número, usando `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` (idempotente, porque puede correr más de una vez en algunos escenarios de despliegue).

## 6. Variables de entorno

No se incluyen valores reales en este documento (ver `.env.example` en cada repo para la lista completa de claves esperadas). Las más relevantes:

- `backend/.env`: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `PORT`. Variables de Google Calendar (`GOOGLE_CLIENT_ID` etc.) están vacías — esa integración no se completó.
- El backend corre detrás de HTTP plano (no HTTPS) en el puerto 3008 — Nginx no termina TLS actualmente. Si se agrega un dominio propio, valdría la pena meter certificado (Let's Encrypt) y forzar HTTPS.

## 7. Decisiones técnicas y gotchas ya resueltos

Estos son bugs reales que costó tiempo diagnosticar — documentados para no repetirlos:

- **`json_agg(DISTINCT … ORDER BY)` no es válido en PostgreSQL 16.** Reescrito con subqueries laterales donde aparecía (ej. `paciente.findById`).
- **`ALTER TABLE … ADD CONSTRAINT IF NOT EXISTS` no es sintaxis válida en Postgres** (solo `ADD COLUMN IF NOT EXISTS` lo es). Las migraciones que agregan constraints deben usar `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` sin el `IF NOT EXISTS`.
- **Campos JSONB necesitan `JSON.stringify()` antes de pasarlos al driver `pg`**, o el insert/update falla silenciosamente o se guarda parcial. Afecta cualquier columna JSONB nueva (ej. `app_datos`, `medicamentos_actuales` en historia clínica).
- **Android 9+ bloquea tráfico HTTP** aunque `usesCleartextTraffic: true` esté en `app.json` — hace falta además un config plugin (`app.plugin.js` en `elys-movil`) que inyecte `network_security_config.xml`. Sin el plugin, los builds EAS siguen bloqueando HTTP.
- **iOS bloquea HTTP por ATS (App Transport Security) por defecto.** Equivalente al punto anterior: se resolvió con una excepción scopeada al dominio del backend en `app.json` → `ios.infoPlist.NSAppTransportSecurity.NSExceptionDomains` (no usar `NSAllowsArbitraryLoads` global — es menos seguro y Apple lo penaliza en review de App Store).
- **Tailwind v4 + `@layer`:** el reset `* { margin: 0; padding: 0 }` debe ir dentro de `@layer base { ... }`, y `@import "tailwindcss"` debe ser la primera línea del CSS — si no, las utilidades de espaciado (`pt-X`, `gap-X`, etc.) no generan CSS.
- **Deuda de código no commiteado (resuelta 2026-06-23):** durante meses, features completas se desplegaban a producción vía `rsync` sin pasar por un commit de git (ver historial de commits del 2026-06-23 con mensajes "Nunca se había commiteado..."). Si en el futuro `git status` vuelve a mostrar un volumen grande de archivos sueltos que datan de sesiones viejas, es este mismo patrón repitiéndose — verificar siempre con un `git clone` fresco + arranque/build antes de confiar en que el repo refleja lo que corre en producción.

## 8. Estado de `gioval-mobile` (en pausa)

`~/elys/gioval-mobile` contiene un scaffold más ambicioso que `elys-movil`: 5 roles (Admin, Cajera, Esteticista, Enfermera, Farmacia), 18 pantallas, cámara, biometría. **No se recomienda continuarlo sin antes limpiarlo**: el proyecto tiene dos inicializaciones de Expo mezcladas en la misma carpeta — el scaffold original (commiteado, navegación por Stack/Tabs con pantallas placeholder) y una reinicialización posterior de `create-expo-app` (con su propia plantilla `expo-router`, `package.json` y estructura `src/app/` distintos). Antes de retomarlo hay que decidir cuál andamiaje conservar y descartar el otro.

Se priorizó en su lugar extender `elys-movil` (ya funcional en Android) para que también corra en iOS — ver sección 1.

## 9. Pendientes conocidos

- **Catálogos de Farmacia:** faltan 5 proveedores por capturar (DermaZone, Long Living Life, HD Cosmetics Efficiency, Elta MD Elandra, Reve) — los datos están en PDFs en Google Drive, pendientes de transcribir a CSV e importar desde `/farmacia/catalogos`.
- **App iOS:** `elys-movil` está configurado para iOS (`bundleIdentifier` + excepción ATS) pero nunca se probó en un dispositivo o Simulador real. Para distribución real (TestFlight) se necesita una cuenta de Apple Developer Program ($99 USD/año), que el cliente no tiene todavía.
- **`gioval-mobile`:** decisión pendiente de si limpiar y continuar, o archivar (ver sección 8).
- **Google Calendar:** la integración existe en el modelo de datos (migración 010) pero las credenciales nunca se configuraron — el calendario no está sincronizado actualmente.
