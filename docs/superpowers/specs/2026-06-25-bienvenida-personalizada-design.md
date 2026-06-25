# Spec: Pantalla de Bienvenida Personalizada

**Fecha:** 2026-06-25  
**Proyecto:** Elys — Gioval Medicina Estética  
**Alcance:** Frontend web únicamente (`~/elys/frontend/`)

---

## Objetivo

Mostrar una pantalla de bienvenida personalizada después del login: saludo con el nombre del usuario y una frase motivacional del día. Aparece una vez por día; el usuario hace clic para continuar al dashboard.

---

## Flujo

1. `LoginPage` login exitoso → navega a `/bienvenida` (en lugar de `/`)
2. `WelcomePage` carga y lee `localStorage.bienvenida_fecha`
   - Si es la fecha de hoy (YYYY-MM-DD) → `<Navigate to="/" replace />` inmediato, sin renderizar la pantalla
   - Si no existe o es fecha distinta → muestra pantalla de bienvenida
3. Usuario hace clic en el botón "Continuar" o en cualquier parte de la pantalla
4. `WelcomePage` guarda `localStorage.bienvenida_fecha = hoy` → `navigate('/')`
5. La ruta `/bienvenida` vive dentro de `ProtectedRoute`, así que requiere token válido

---

## Componente `WelcomePage.jsx`

### Saludo personalizado

```js
const nombre = localStorage.getItem('nombre') || 'bienvenida';
const hora = new Date().getHours();
const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
// → "Buenos días, Dra. Giovanna"
```

### Frase del día

Lista fija de ~30 frases en el componente. Rotación por día del año:

```js
const frases = [ /* 30 frases */ ];
const ahora = new Date();
const diaAnio = Math.floor((ahora - new Date(ahora.getFullYear(), 0, 0)) / 86400000);
const frase = frases[diaAnio % frases.length];
```

Frases orientadas a medicina estética, bienestar y motivación profesional. Ejemplos:
- "La confianza que devuelves a cada paciente es el tratamiento más poderoso."
- "Cada consulta es una oportunidad de transformar, no solo de tratar."
- "El cuidado que pones en tu trabajo se refleja en el bienestar de quienes confían en ti."

### Lógica "una vez al día"

```js
const HOY = new Date().toISOString().split('T')[0]; // "2026-06-25"
if (localStorage.getItem('bienvenida_fecha') === HOY) return <Navigate to="/" replace />;
// al continuar:
localStorage.setItem('bienvenida_fecha', HOY);
navigate('/');
```

---

## UI

- **Fondo:** `#f5f2f0` crema (toda la pantalla, `min-h-screen`)
- **Layout:** flex column, centrado vertical y horizontal
- **Saludo:** fuente Meganté, color `#887482` malva, `~3rem`, peso normal
- **Divisor:** línea horizontal `#ced1ca` sage, ancho ~200px
- **Frase:** Montserrat italic 300, color `#aba3ba` lila, `~1.1rem`
- **Botón "Continuar →":** bg `#aba3ba` lila, texto blanco, Montserrat 500, padding generoso, borde redondeado
- **Click en pantalla completa:** también avanza (onClick en el wrapper)
- **Sin logo** (pantalla limpia, texto como protagonista)

---

## Tipografía nueva en Elys

La pantalla usa Meganté y Montserrat, que no existen en el frontend de Elys actualmente.

**Assets a agregar:**
- `frontend/public/fonts/Megante.ttf` — copia desde `~/gioval-landing/public/fonts/Megante.ttf`

**Cambios en `frontend/src/index.css`:**
```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap');

@font-face {
  font-family: 'Megante';
  src: url('/fonts/Megante.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

Estas adiciones no afectan los estilos existentes de la app (Playfair Display + Jost siguen activos).

---

## Archivos modificados / creados

| Archivo | Acción |
|---------|--------|
| `frontend/public/fonts/Megante.ttf` | nuevo — copia del font |
| `frontend/src/index.css` | editar — agregar @font-face + Montserrat import |
| `frontend/src/pages/WelcomePage.jsx` | nuevo — componente completo |
| `frontend/src/pages/LoginPage.jsx` | editar — `navigate('/bienvenida')` |
| `frontend/src/App.jsx` | editar — agregar `<Route path="/bienvenida" ...>` |

---

## Fuera de scope

- Panel admin para editar frases (YAGNI — lista fija suficiente por ahora)
- App móvil (`elys-movil`) — pendiente para sesión futura
- Animaciones de entrada (pantalla estática es suficiente)
