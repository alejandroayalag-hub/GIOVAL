# Gioval Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone marketing landing page for Gioval Medicina Estética with appointment-request integration to the existing Elys backend, served on Nginx port 8089.

**Architecture:** Static Vite + React 19 site at `~/gioval-landing/`. The "Agenda tu cita" form POSTs to a new public endpoint on the Elys backend (port 3008, no auth). The Elys admin reviews requests in a new "Solicitudes" tab. A WhatsApp floating button provides an instant-contact alternative. No authentication, no database, no backend needed for the landing itself.

**Tech Stack:** Vite 6, React 19, Tailwind CSS v4 (@tailwindcss/vite), Lucide React, Fetch API

**Design Language (from brandbook + Velina/Dagné Pupo references):**
- Background: `#F5F2F0` crema | Primary/CTA: `#887482` malva | Text: `#4D4846` carbon
- Display font: Cormorant Garamond (Meganté spirit — high-contrast serif, editorial)
- Body font: Montserrat (Gotham spirit — geometric, wide tracking, clean caps)
- Style: editorial luxury — full-bleed photos, numbered service cards, stats counters, warm cream base

---

## File Map

**New project `~/gioval-landing/`:**
```
index.html
package.json
vite.config.js
public/
  logo-gioval.svg             # Logo SVG (text-based approximation, replace with export)
  logo-gioval-white.svg       # White version for dark backgrounds
src/
  main.jsx
  App.jsx
  index.css                   # Tailwind v4 + @theme tokens + Google Fonts import
  components/
    Navbar.jsx                # Sticky, transparent→white on scroll, hamburger mobile
    Hero.jsx                  # Full-viewport, dark overlay, editorial headline, 2 CTAs
    StatsBar.jsx              # 4 counters: pacientes, experiencia, tratamientos, categorías
    Services.jsx              # 8-card grid, numbered, photo + hover overlay
    About.jsx                 # 2-col: Dra. Giovanna text + photo + pull quote
    Testimonials.jsx          # 3 testimonial cards, star rating
    Gallery.jsx               # Masonry placeholder grid (replace with real photos)
    AppointmentSection.jsx    # Malva-bg CTA section, opens modal
    AppointmentModal.jsx      # Form: nombre, teléfono, email, servicio, fecha, notas
    WhatsAppButton.jsx        # Fixed bottom-right floating button
    Footer.jsx                # Dark carbon, 4 columns: logo, servicios, contacto, redes
  api/
    solicitudes.js            # POST /api/public/solicitudes to Elys backend
```

**Modifications to `~/elys/`:**
```
backend/src/db/migrations/022_solicitudes_cita.sql    # NEW table solicitudes_cita
backend/src/controllers/solicitudesPublicController.js # NEW public POST handler
backend/src/routes/public.js                          # NEW public routes (no auth)
backend/src/index.js                                  # Register /api/public routes + update CORS
frontend/src/api/solicitudes.js                       # NEW fetch solicitudes for admin
frontend/src/components/citas/SolicitudesTab.jsx      # NEW tab component
frontend/src/pages/CitasPage.jsx                      # Add "Solicitudes" tab
```

---

## Task 1: Project Setup

**Files:**
- Create: `~/gioval-landing/` (entire project)

- [ ] **Step 1: Scaffold project**

```bash
cd ~
npm create vite@latest gioval-landing -- --template react
cd gioval-landing
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install lucide-react
npm install -D @tailwindcss/vite
```

- [ ] **Step 3: Configure Vite with Tailwind v4**

Replace `vite.config.js` entirely:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 4: Replace `src/index.css`**

```css
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Montserrat:wght@300;400;500;600;700&display=swap');

@theme {
  --color-gioval-crema:   #F5F2F0;
  --color-gioval-malva:   #887482;
  --color-gioval-lila:    #ABA3BA;
  --color-gioval-lavanda: #CCCAD8;
  --color-gioval-sage:    #CED1CA;
  --color-gioval-beige:   #DED7CE;
  --color-gioval-greige:  #BFB9B3;
  --color-gioval-blanco:  #F8F7F6;
  --color-gioval-carbon:  #4D4846;

  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-body:    'Montserrat', system-ui, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  background-color: #F5F2F0;
  color: #4D4846;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 5: Replace `src/App.jsx` with empty shell**

```jsx
export default function App() {
  return <div className="bg-gioval-crema min-h-screen">Landing Gioval</div>
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Browser at `http://localhost:5173` shows "Landing Gioval" on cream background. No errors in console.

- [ ] **Step 7: Commit**

```bash
cd ~/gioval-landing
git init
git add -A
git commit -m "feat: scaffold gioval-landing — Vite + React + Tailwind v4"
```

---

## Task 2: Logo SVGs

**Files:**
- Create: `~/gioval-landing/public/logo-gioval.svg`
- Create: `~/gioval-landing/public/logo-gioval-white.svg`

> These are CSS-text approximations using Cormorant Garamond. Replace later with vector export from the GIOVAL-BRANDBOOK.pdf.

- [ ] **Step 1: Create dark logo SVG**

```bash
cat > ~/gioval-landing/public/logo-gioval.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80" width="280" height="80">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&amp;display=swap');
      .logo-main { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 52px; font-weight: 400; fill: #887482; }
      .logo-sub  { font-family: 'Montserrat', sans-serif; font-size: 9px; font-weight: 500; fill: #887482; letter-spacing: 0.25em; }
    </style>
  </defs>
  <text x="0" y="52" class="logo-main">gioval</text>
  <text x="2" y="70" class="logo-sub">MEDICINA ESTÉTICA</text>
</svg>
EOF
```

- [ ] **Step 2: Create white logo SVG**

```bash
sed 's/fill: #887482/fill: #F5F2F0/g' ~/gioval-landing/public/logo-gioval.svg > ~/gioval-landing/public/logo-gioval-white.svg
```

- [ ] **Step 3: Commit**

```bash
cd ~/gioval-landing
git add public/
git commit -m "feat: add logo SVG placeholders (replace with brandbook export)"
```

---

## Task 3: Navbar

**Files:**
- Create: `~/gioval-landing/src/components/Navbar.jsx`

- [ ] **Step 1: Create Navbar**

```jsx
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'Servicios',       href: '#servicios' },
  { label: 'Nosotros',        href: '#nosotros' },
  { label: 'Testimonios',     href: '#testimonios' },
  { label: 'Galería',         href: '#galeria' },
  { label: 'Contacto',        href: '#contacto' },
]

export default function Navbar({ onAgendarClick }) {
  const [scrolled,   setScrolled]   = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-gioval-crema/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex-shrink-0">
          <img
            src={scrolled ? '/logo-gioval.svg' : '/logo-gioval-white.svg'}
            alt="Gioval Medicina Estética"
            className="h-9 w-auto"
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={`font-body text-xs tracking-widest uppercase transition-colors duration-200 ${
                scrolled
                  ? 'text-gioval-carbon hover:text-gioval-malva'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={onAgendarClick}
            className="font-body text-xs tracking-widest uppercase px-6 py-2.5 border transition-all duration-200 cursor-pointer bg-gioval-malva border-gioval-malva text-white hover:bg-gioval-carbon hover:border-gioval-carbon"
          >
            Agenda tu cita
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 cursor-pointer"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Abrir menú"
        >
          {menuOpen
            ? <X size={22} className={scrolled ? 'text-gioval-carbon' : 'text-white'} />
            : <Menu size={22} className={scrolled ? 'text-gioval-carbon' : 'text-white'} />
          }
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gioval-crema border-t border-gioval-beige px-6 py-4 flex flex-col gap-4">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="font-body text-xs tracking-widest uppercase text-gioval-carbon hover:text-gioval-malva transition-colors"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { setMenuOpen(false); onAgendarClick() }}
            className="mt-2 font-body text-xs tracking-widest uppercase px-6 py-3 bg-gioval-malva text-white cursor-pointer"
          >
            Agenda tu cita
          </button>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Add to App.jsx temporarily to verify**

```jsx
import Navbar from './components/Navbar'
export default function App() {
  return (
    <div className="bg-gioval-carbon min-h-screen">
      <Navbar onAgendarClick={() => {}} />
    </div>
  )
}
```

- [ ] **Step 3: Verify visually**

Run `npm run dev`. Scroll down — navbar should go from transparent (white text) to cream background (dark text). Check mobile hamburger at 375px.

- [ ] **Step 4: Commit**

```bash
cd ~/gioval-landing
git add src/components/Navbar.jsx src/App.jsx
git commit -m "feat: Navbar — sticky, scroll-aware, mobile responsive"
```

---

## Task 4: Hero Section

**Files:**
- Create: `~/gioval-landing/src/components/Hero.jsx`

- [ ] **Step 1: Create Hero**

```jsx
export default function Hero({ onAgendarClick }) {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex flex-col justify-end pb-16 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #4D4846 0%, #887482 50%, #ABA3BA 100%)',
      }}
    >
      {/* Overlay — replace background with real hero image later:
          style={{ backgroundImage: 'url(/hero.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          and add: <div className="absolute inset-0 bg-gioval-carbon/60" /> */}

      {/* Decorative circles */}
      <div className="absolute top-1/4 right-10 w-80 h-80 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute top-1/3 right-20 w-48 h-48 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-gioval-malva/20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-32">
        {/* Eyebrow */}
        <p className="font-body text-xs tracking-[0.3em] uppercase text-white/60 mb-6">
          Querétaro, México
        </p>

        {/* Headline — editorial mix: regular + italic Cormorant */}
        <h1
          className="font-display text-white leading-none mb-6"
          style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', fontWeight: 400 }}
        >
          Revela tu
          <br />
          <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#CCCAD8' }}>
            versión más radiante
          </em>
        </h1>

        {/* Subheadline */}
        <p className="font-body text-white/70 text-sm tracking-wide max-w-md mb-10 leading-relaxed">
          Medicina estética de alta especialidad. Tratamientos personalizados
          respaldados por ciencia, experiencia y el cuidado de la Dra. Giovanna.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 mb-16">
          <button
            onClick={onAgendarClick}
            className="font-body text-xs tracking-[0.2em] uppercase px-8 py-4 bg-gioval-malva text-white hover:bg-white hover:text-gioval-malva transition-all duration-300 cursor-pointer"
          >
            Agenda tu cita
          </button>
          <a
            href="#servicios"
            className="font-body text-xs tracking-[0.2em] uppercase px-8 py-4 border border-white/40 text-white hover:bg-white/10 transition-all duration-300"
          >
            Ver servicios
          </a>
        </div>

        {/* Stats bar — bottom of hero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/20 pt-8">
          {[
            { num: '500+',  label: 'Pacientes satisfechas' },
            { num: '8+',    label: 'Años de experiencia' },
            { num: '100+',  label: 'Tratamientos especializados' },
            { num: '9',     label: 'Categorías de servicio' },
          ].map(s => (
            <div key={s.label}>
              <p
                className="font-display text-gioval-lavanda leading-none mb-1"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
              >
                {s.num}
              </p>
              <p className="font-body text-white/50 text-xs tracking-widest uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add to App.jsx**

```jsx
import Navbar from './components/Navbar'
import Hero from './components/Hero'
export default function App() {
  return (
    <div className="bg-gioval-crema">
      <Navbar onAgendarClick={() => {}} />
      <Hero onAgendarClick={() => {}} />
    </div>
  )
}
```

- [ ] **Step 3: Verify visually**

Run `npm run dev`. Hero should fill the screen with purple-malva gradient, large Cormorant Garamond headline, 4 stats at the bottom. Check mobile at 375px — text should not overflow.

- [ ] **Step 4: Commit**

```bash
cd ~/gioval-landing
git add src/components/Hero.jsx src/App.jsx
git commit -m "feat: Hero — full-viewport editorial headline, stats bar, dual CTA"
```

---

## Task 5: Services Section

**Files:**
- Create: `~/gioval-landing/src/components/Services.jsx`

- [ ] **Step 1: Create Services**

```jsx
const SERVICES = [
  {
    num: '01',
    name: 'Medicina Estética',
    desc: 'Botox, ácido hialurónico, armonización facial y skin boosters.',
    color: '#887482',
  },
  {
    num: '02',
    name: 'Tratamientos Faciales',
    desc: 'Limpiezas profundas, peelings, microdermoabrasión e hidratación.',
    color: '#ABA3BA',
  },
  {
    num: '03',
    name: 'Tratamientos Capilares',
    desc: 'Implante capilar FUE, PRP capilar y tricología avanzada.',
    color: '#CCCAD8',
  },
  {
    num: '04',
    name: 'Control de Peso',
    desc: 'Programas médicos de reducción y recomposición corporal.',
    color: '#CED1CA',
  },
  {
    num: '05',
    name: 'Aparatología',
    desc: 'Radiofrecuencia, ultrasonido, criolipólisis y tecnología de punta.',
    color: '#DED7CE',
  },
  {
    num: '06',
    name: 'Tratamientos de Spa',
    desc: 'Experiencias de relajación y bienestar integral en clínica.',
    color: '#BFB9B3',
  },
  {
    num: '07',
    name: 'Medicina Regenerativa',
    desc: 'PRP, factores de crecimiento, bioestimulación y células madre.',
    color: '#887482',
  },
  {
    num: '08',
    name: 'Medicina Funcional',
    desc: 'Test epigenético, nutrición de precisión y medicina preventiva.',
    color: '#ABA3BA',
  },
]

export default function Services() {
  return (
    <section id="servicios" className="bg-gioval-crema py-24 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-16">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-gioval-malva mb-4">
            Nuestros servicios
          </p>
          <h2
            className="font-display text-gioval-carbon leading-tight"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 400 }}
          >
            Tratamientos
            <br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#887482' }}>
              diseñados para ti
            </em>
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gioval-beige">
          {SERVICES.map(s => (
            <ServiceCard key={s.num} {...s} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ServiceCard({ num, name, desc, color }) {
  return (
    <div className="group relative bg-gioval-crema p-8 overflow-hidden cursor-default transition-all duration-300 hover:bg-gioval-carbon">
      {/* Number */}
      <p
        className="font-display text-gioval-beige group-hover:text-gioval-malva/30 transition-colors duration-300 leading-none mb-6 select-none"
        style={{ fontSize: '4rem', fontStyle: 'italic', fontWeight: 300 }}
      >
        {num}
      </p>

      {/* Name */}
      <h3
        className="font-display text-gioval-carbon group-hover:text-white transition-colors duration-300 mb-3 leading-snug"
        style={{ fontSize: '1.35rem', fontWeight: 500 }}
      >
        {name}
      </h3>

      {/* Desc */}
      <p className="font-body text-xs leading-relaxed text-gioval-greige group-hover:text-white/60 transition-colors duration-300">
        {desc}
      </p>

      {/* Hover accent line */}
      <div
        className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Add to App.jsx**

```jsx
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Services'

export default function App() {
  return (
    <div className="bg-gioval-crema">
      <Navbar onAgendarClick={() => {}} />
      <Hero onAgendarClick={() => {}} />
      <Services />
    </div>
  )
}
```

- [ ] **Step 3: Verify visually**

Grid de 8 cards 4×2 en desktop. Hover: fondo carbon + acento de color abajo. Mobile: 1 columna. Números grandes en Cormorant italic.

- [ ] **Step 4: Commit**

```bash
cd ~/gioval-landing
git add src/components/Services.jsx src/App.jsx
git commit -m "feat: Services section — 8-card numbered grid with hover reveal"
```

---

## Task 6: About Section

**Files:**
- Create: `~/gioval-landing/src/components/About.jsx`

- [ ] **Step 1: Create About**

```jsx
export default function About() {
  return (
    <section id="nosotros" className="bg-gioval-blanco py-24 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Text side */}
        <div>
          <p className="font-body text-xs tracking-[0.3em] uppercase text-gioval-malva mb-6">
            Sobre Gioval
          </p>

          <h2
            className="font-display text-gioval-carbon leading-tight mb-8"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 400 }}
          >
            Belleza respaldada
            <br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#887482' }}>
              por la medicina
            </em>
          </h2>

          {/* Pull quote */}
          <blockquote
            className="font-display text-gioval-malva border-l-2 border-gioval-malva pl-6 mb-8"
            style={{ fontSize: '1.4rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.5 }}
          >
            "La estética desde la ética — cada tratamiento es una decisión médica, no solo cosmética."
          </blockquote>

          <p className="font-body text-gioval-greige text-sm leading-relaxed mb-4">
            La Dra. Giovanna lidera Gioval con una filosofía clara: la medicina estética
            debe ser segura, personalizada y basada en evidencia científica. Cada paciente
            recibe una valoración integral antes de cualquier procedimiento.
          </p>
          <p className="font-body text-gioval-greige text-sm leading-relaxed mb-8">
            Con más de 8 años de experiencia en medicina estética y certificaciones en las
            técnicas más avanzadas, la Dra. Giovanna ha atendido a cientos de pacientes
            en Querétaro que buscan verse y sentirse mejor, de forma segura.
          </p>

          {/* Credentials */}
          <div className="grid grid-cols-2 gap-4">
            {[
              'Médico cirujano certificado',
              'Especialidad en medicina estética',
              'Certificación internacional NOM-004',
              'Miembro de asociaciones médicas',
            ].map(c => (
              <div key={c} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-gioval-malva mt-1.5 flex-shrink-0" />
                <p className="font-body text-xs text-gioval-carbon">{c}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Image side */}
        <div className="relative">
          {/* Photo placeholder — replace with: <img src="/dra-giovanna.jpg" ... /> */}
          <div
            className="w-full aspect-[3/4] bg-gioval-lavanda flex items-end p-8"
            style={{ background: 'linear-gradient(160deg, #CCCAD8 0%, #887482 100%)' }}
          >
            <div>
              <p className="font-display text-white text-xl font-light">Dra. Giovanna</p>
              <p className="font-body text-white/70 text-xs tracking-widest uppercase">
                Directora Médica · Gioval
              </p>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-6 -left-6 bg-gioval-crema shadow-lg p-6 max-w-[160px]">
            <p
              className="font-display text-gioval-malva leading-none mb-1"
              style={{ fontSize: '2.5rem', fontWeight: 300 }}
            >
              8+
            </p>
            <p className="font-body text-gioval-carbon text-xs tracking-widest uppercase leading-tight">
              Años de experiencia
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add to App.jsx after Services**

```jsx
import About from './components/About'
// ... after <Services />
<About />
```

- [ ] **Step 3: Verify visually**

Dos columnas en desktop: texto izquierda con pull quote en malva + credenciales, imagen/placeholder derecha con badge flotante. Mobile: columna única imagen abajo.

- [ ] **Step 4: Commit**

```bash
cd ~/gioval-landing
git add src/components/About.jsx src/App.jsx
git commit -m "feat: About section — 2-col with pull quote, credentials, photo placeholder"
```

---

## Task 7: Testimonials Section

**Files:**
- Create: `~/gioval-landing/src/components/Testimonials.jsx`

- [ ] **Step 1: Create Testimonials**

```jsx
import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'María G.',
    treatment: 'Armonización facial',
    text: 'Desde la primera valoración me sentí segura. La Dra. Giovanna explicó cada paso del proceso y los resultados superaron mis expectativas. Totalmente recomendada.',
  },
  {
    name: 'Laura M.',
    treatment: 'Botox y skin boosters',
    text: 'El ambiente de la clínica es tranquilo y el equipo muy profesional. Me ayudaron a lograr resultados naturales. Ya es mi lugar de confianza en Querétaro.',
  },
  {
    name: 'Ana R.',
    treatment: 'PRP capilar',
    text: 'Llevaba meses buscando una solución para la pérdida de cabello. Con el tratamiento de la Dra. Giovanna noté cambios desde la primera sesión. Excelente atención.',
  },
]

function Stars() {
  return (
    <div className="flex gap-0.5 mb-4">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} className="fill-gioval-malva text-gioval-malva" />
      ))}
    </div>
  )
}

export default function Testimonials() {
  return (
    <section id="testimonios" className="bg-gioval-crema py-24 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">

        <div className="mb-16">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-gioval-malva mb-4">
            Testimonios
          </p>
          <h2
            className="font-display text-gioval-carbon leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}
          >
            Lo que dicen
            <br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#887482' }}>
              nuestras pacientes
            </em>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-gioval-blanco p-8 border border-gioval-beige">
              <Stars />
              <p
                className="font-display text-gioval-carbon mb-6 leading-snug"
                style={{ fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 400 }}
              >
                "{t.text}"
              </p>
              <div className="border-t border-gioval-beige pt-4">
                <p className="font-body text-gioval-carbon text-sm font-500">{t.name}</p>
                <p className="font-body text-gioval-greige text-xs tracking-widest uppercase mt-0.5">
                  {t.treatment}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add to App.jsx after About**

```jsx
import Testimonials from './components/Testimonials'
// ... after <About />
<Testimonials />
```

- [ ] **Step 3: Verify**

3 cards blancas con borde beige, estrellas malva, texto en Cormorant italic, nombre/tratamiento en footer de card. Mobile: 1 columna.

- [ ] **Step 4: Commit**

```bash
cd ~/gioval-landing
git add src/components/Testimonials.jsx src/App.jsx
git commit -m "feat: Testimonials — 3-card grid with star ratings"
```

---

## Task 8: Gallery Section

**Files:**
- Create: `~/gioval-landing/src/components/Gallery.jsx`

- [ ] **Step 1: Create Gallery**

```jsx
// Gradient placeholder cells — replace bg gradients with <img src="..." /> when photos are available
const CELLS = [
  { span: 'col-span-2 row-span-2', gradient: 'from-gioval-malva to-gioval-carbon', label: 'Tratamientos faciales' },
  { span: 'col-span-1 row-span-1', gradient: 'from-gioval-lavanda to-gioval-lila',  label: 'Medicina inyectable' },
  { span: 'col-span-1 row-span-1', gradient: 'from-gioval-sage to-gioval-beige',    label: 'Tratamientos corporales' },
  { span: 'col-span-1 row-span-2', gradient: 'from-gioval-lila to-gioval-malva',    label: 'Capilares' },
  { span: 'col-span-2 row-span-1', gradient: 'from-gioval-beige to-gioval-greige',  label: 'Ambiente clínica' },
]

export default function Gallery() {
  return (
    <section id="galeria" className="bg-gioval-carbon py-24 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">

        <div className="mb-12">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-gioval-lila mb-4">
            Galería
          </p>
          <h2
            className="font-display text-white leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400 }}
          >
            Puedes verlo
            <br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#CCCAD8' }}>
              y sentirlo
            </em>
          </h2>
        </div>

        {/* Masonry-style grid */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2 h-[480px] md:h-[600px]">
          {CELLS.map(c => (
            <div
              key={c.label}
              className={`${c.span} relative overflow-hidden group cursor-pointer bg-gradient-to-br ${c.gradient}`}
            >
              {/* Label overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-end p-4">
                <p className="font-body text-xs tracking-widest uppercase text-white/0 group-hover:text-white/80 transition-all duration-300">
                  {c.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="font-body text-gioval-greige text-xs text-center mt-6 tracking-wide">
          Fotos reales de tratamientos y clínica próximamente
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add to App.jsx after Testimonials**

```jsx
import Gallery from './components/Gallery'
// ... after <Testimonials />
<Gallery />
```

- [ ] **Step 3: Verify**

Grid 3×3 con gradientes GIOVAL. Hover: overlay negro semitransparente + label. Sección fondo carbon. Mobile: altura reducida pero visible.

- [ ] **Step 4: Commit**

```bash
cd ~/gioval-landing
git add src/components/Gallery.jsx src/App.jsx
git commit -m "feat: Gallery section — masonry grid with gradient placeholders"
```

---

## Task 9: Solicitudes API Client

**Files:**
- Create: `~/gioval-landing/src/api/solicitudes.js`

- [ ] **Step 1: Create API client**

```js
// Base URL del backend Elys. En prod: http://62.238.3.136:3008
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3008'

/**
 * Envía una solicitud de cita al backend Elys.
 * @param {{ nombre: string, apellido: string, telefono: string, email: string,
 *           servicio: string, fecha_preferida: string, notas: string }} data
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function enviarSolicitud(data) {
  const res = await fetch(`${API_BASE}/api/public/solicitudes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Error al enviar la solicitud')
  return json
}
```

- [ ] **Step 2: Create `.env.example` and `.env` for local dev**

```bash
echo "VITE_API_URL=http://localhost:3008" > ~/gioval-landing/.env
echo "VITE_API_URL=http://SERVIDOR:3008" > ~/gioval-landing/.env.example
```

- [ ] **Step 3: Commit**

```bash
cd ~/gioval-landing
git add src/api/solicitudes.js .env.example
git commit -m "feat: solicitudes API client with env-based base URL"
```

---

## Task 10: Appointment Modal

**Files:**
- Create: `~/gioval-landing/src/components/AppointmentModal.jsx`

- [ ] **Step 1: Create AppointmentModal**

```jsx
import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { enviarSolicitud } from '../api/solicitudes'

const SERVICIOS = [
  '01 · Medicina Estética',
  '02 · Tratamientos Faciales',
  '03 · Tratamientos Capilares',
  '04 · Control de Peso',
  '05 · Aparatología',
  '06 · Tratamientos de Spa',
  '07 · Medicina Regenerativa',
  '08 · Medicina Funcional',
  'No lo sé todavía — quiero una valoración',
]

const INITIAL = {
  nombre: '', apellido: '', telefono: '', email: '',
  servicio: '', fecha_preferida: '', notas: '',
}

export default function AppointmentModal({ open, onClose }) {
  const [form,    setForm]    = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState(null) // 'success' | 'error'
  const [errMsg,  setErrMsg]  = useState('')

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    setErrMsg('')
    try {
      await enviarSolicitud(form)
      setStatus('success')
      setForm(INITIAL)
    } catch (err) {
      setStatus('error')
      setErrMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full font-body text-sm text-gioval-carbon bg-transparent border-b border-gioval-beige focus:border-gioval-malva outline-none py-2 transition-colors duration-200 placeholder:text-gioval-greige'
  const labelCls = 'font-body text-xs tracking-widest uppercase text-gioval-greige block mb-1'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gioval-carbon/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 bg-gioval-crema w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-8 pb-6 border-b border-gioval-beige">
          <div>
            <p className="font-body text-xs tracking-[0.3em] uppercase text-gioval-malva mb-1">
              Gioval Medicina Estética
            </p>
            <h2
              className="font-display text-gioval-carbon"
              style={{ fontSize: '1.75rem', fontWeight: 400 }}
            >
              Agenda tu cita
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gioval-greige hover:text-gioval-carbon transition-colors cursor-pointer mt-1"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {/* Success state */}
          {status === 'success' && (
            <div className="flex flex-col items-center text-center py-8">
              <CheckCircle size={48} className="text-gioval-malva mb-4" />
              <h3 className="font-display text-gioval-carbon text-xl mb-2">¡Solicitud enviada!</h3>
              <p className="font-body text-gioval-greige text-sm leading-relaxed mb-6">
                Recibimos tu solicitud. Nuestro equipo se pondrá en contacto contigo
                dentro de las próximas 24 horas para confirmar tu cita.
              </p>
              <button
                onClick={onClose}
                className="font-body text-xs tracking-widest uppercase px-8 py-3 bg-gioval-malva text-white hover:bg-gioval-carbon transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-4 mb-6">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="font-body text-red-700 text-xs">{errMsg || 'Ocurrió un error. Intenta de nuevo o escríbenos por WhatsApp.'}</p>
            </div>
          )}

          {/* Form */}
          {status !== 'success' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input required value={form.nombre} onChange={set('nombre')}
                    placeholder="Tu nombre" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Apellido *</label>
                  <input required value={form.apellido} onChange={set('apellido')}
                    placeholder="Tu apellido" className={inputCls} />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className={labelCls}>Teléfono *</label>
                <input required type="tel" value={form.telefono} onChange={set('telefono')}
                  placeholder="55 1234 5678" className={inputCls} />
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={set('email')}
                  placeholder="tu@email.com" className={inputCls} />
              </div>

              {/* Servicio */}
              <div>
                <label className={labelCls}>Servicio de interés *</label>
                <select required value={form.servicio} onChange={set('servicio')}
                  className={`${inputCls} cursor-pointer`}>
                  <option value="">Selecciona un servicio...</option>
                  {SERVICIOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Fecha preferida */}
              <div>
                <label className={labelCls}>Fecha preferida</label>
                <input type="date" value={form.fecha_preferida} onChange={set('fecha_preferida')}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputCls} />
              </div>

              {/* Notas */}
              <div>
                <label className={labelCls}>Mensaje o notas adicionales</label>
                <textarea value={form.notas} onChange={set('notas')} rows={3}
                  placeholder="Cuéntanos un poco más sobre lo que buscas..."
                  className={`${inputCls} resize-none`} />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-body text-xs tracking-[0.2em] uppercase py-4 bg-gioval-malva text-white hover:bg-gioval-carbon transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>

              <p className="font-body text-gioval-greige text-xs text-center leading-relaxed">
                También puedes escribirnos directamente por{' '}
                <a
                  href="https://wa.me/521XXXXXXXXXX?text=Hola%20Gioval%2C%20me%20gustar%C3%ADa%20agendar%20una%20cita"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gioval-malva underline"
                >
                  WhatsApp
                </a>
                {/* ↑ Reemplazar 521XXXXXXXXXX con el número real de WhatsApp de Gioval */}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test modal renders**

En `App.jsx` temporalmente:
```jsx
import AppointmentModal from './components/AppointmentModal'
// En el componente:
const [modalOpen, setModalOpen] = useState(true) // temporal: true para ver modal
<AppointmentModal open={modalOpen} onClose={() => setModalOpen(false)} />
```

Verificar: modal centrado, scroll interno, Escape cierra, click en backdrop cierra.

- [ ] **Step 3: Commit**

```bash
cd ~/gioval-landing
git add src/components/AppointmentModal.jsx src/api/solicitudes.js
git commit -m "feat: AppointmentModal — form with loading/success/error states"
```

---

## Task 11: Appointment CTA Section + WhatsApp Button

**Files:**
- Create: `~/gioval-landing/src/components/AppointmentSection.jsx`
- Create: `~/gioval-landing/src/components/WhatsAppButton.jsx`

- [ ] **Step 1: Create AppointmentSection**

```jsx
export default function AppointmentSection({ onAgendarClick }) {
  return (
    <section
      id="contacto"
      className="py-32 px-6 lg:px-12"
      style={{ background: 'linear-gradient(135deg, #887482 0%, #4D4846 100%)' }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-body text-xs tracking-[0.3em] uppercase text-white/50 mb-6">
          Primer paso
        </p>

        <h2
          className="font-display text-white leading-tight mb-6"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 300 }}
        >
          Tu bienestar
          <br />
          <em style={{ fontStyle: 'italic', color: '#CCCAD8' }}>
            comienza aquí
          </em>
        </h2>

        <p className="font-body text-white/60 text-sm leading-relaxed mb-12 max-w-lg mx-auto">
          Agenda una valoración sin compromiso. La Dra. Giovanna te escuchará,
          evaluará tu caso y te presentará un plan de tratamiento personalizado.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onAgendarClick}
            className="font-body text-xs tracking-[0.2em] uppercase px-10 py-4 bg-white text-gioval-malva hover:bg-gioval-crema transition-colors duration-200 cursor-pointer"
          >
            Solicitar valoración
          </button>
          <a
            href="https://wa.me/521XXXXXXXXXX?text=Hola%20Gioval%2C%20quisiera%20informaci%C3%B3n%20sobre%20tratamientos"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-xs tracking-[0.2em] uppercase px-10 py-4 border border-white/40 text-white hover:bg-white/10 transition-colors duration-200"
          >
            Escribir por WhatsApp
          </a>
          {/* ↑ Reemplazar 521XXXXXXXXXX con número real */}
        </div>

        {/* Horario */}
        <p className="font-body text-white/40 text-xs mt-10 tracking-widest uppercase">
          Lunes a Sábado · 10:00 am – 7:00 pm
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create WhatsAppButton**

```jsx
import { MessageCircle } from 'lucide-react'

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/521XXXXXXXXXX?text=Hola%20Gioval%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20tratamientos"
      // ↑ Reemplazar 521XXXXXXXXXX con número real de WhatsApp de Gioval
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 shadow-lg hover:bg-[#1ebe57] transition-colors duration-200 group"
    >
      <MessageCircle size={20} fill="white" />
      <span className="font-body text-xs tracking-widest uppercase max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
        WhatsApp
      </span>
    </a>
  )
}
```

- [ ] **Step 3: Add to App.jsx after Gallery**

```jsx
import AppointmentSection from './components/AppointmentSection'
import WhatsAppButton from './components/WhatsAppButton'
// ... after <Gallery />
<AppointmentSection onAgendarClick={...} />
<WhatsAppButton />
```

- [ ] **Step 4: Commit**

```bash
cd ~/gioval-landing
git add src/components/AppointmentSection.jsx src/components/WhatsAppButton.jsx src/App.jsx
git commit -m "feat: AppointmentSection CTA + WhatsApp floating button"
```

---

## Task 12: Footer

**Files:**
- Create: `~/gioval-landing/src/components/Footer.jsx`

- [ ] **Step 1: Create Footer**

```jsx
import { Instagram, Facebook, MapPin, Phone, Mail } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gioval-carbon text-white py-16 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

          {/* Col 1: Logo + tagline */}
          <div className="md:col-span-1">
            <img src="/logo-gioval-white.svg" alt="Gioval" className="h-10 w-auto mb-4" />
            <p className="font-body text-white/40 text-xs leading-relaxed">
              Medicina estética de alta especialidad en Querétaro.
              Belleza respaldada por la ciencia.
            </p>
          </div>

          {/* Col 2: Servicios */}
          <div>
            <p className="font-body text-xs tracking-[0.25em] uppercase text-gioval-lila mb-4">
              Servicios
            </p>
            <ul className="space-y-2">
              {[
                'Medicina Estética', 'Tratamientos Faciales', 'Tratamientos Capilares',
                'Control de Peso', 'Medicina Regenerativa', 'Medicina Funcional',
              ].map(s => (
                <li key={s}>
                  <a href="#servicios" className="font-body text-white/50 text-xs hover:text-white transition-colors">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contacto */}
          <div>
            <p className="font-body text-xs tracking-[0.25em] uppercase text-gioval-lila mb-4">
              Contacto
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-gioval-malva mt-0.5 flex-shrink-0" />
                <span className="font-body text-white/50 text-xs leading-relaxed">
                  Querétaro, México
                  {/* Reemplazar con dirección real */}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-gioval-malva flex-shrink-0" />
                <a href="tel:+524421234567" className="font-body text-white/50 text-xs hover:text-white transition-colors">
                  +52 (442) 123-4567
                  {/* Reemplazar con teléfono real */}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-gioval-malva flex-shrink-0" />
                <a href="mailto:contacto@gioval.mx" className="font-body text-white/50 text-xs hover:text-white transition-colors">
                  contacto@gioval.mx
                  {/* Reemplazar con email real */}
                </a>
              </li>
            </ul>
            <p className="font-body text-white/30 text-xs mt-4">
              Lun – Sáb · 10:00 – 19:00
            </p>
          </div>

          {/* Col 4: Redes */}
          <div>
            <p className="font-body text-xs tracking-[0.25em] uppercase text-gioval-lila mb-4">
              Síguenos
            </p>
            <div className="flex gap-3">
              <a
                href="https://instagram.com/gioval.mx"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="p-2 border border-white/20 text-white/50 hover:text-white hover:border-white transition-all duration-200"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://facebook.com/gioval.mx"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="p-2 border border-white/20 text-white/50 hover:text-white hover:border-white transition-all duration-200"
              >
                <Facebook size={16} />
              </a>
            </div>
            {/* ↑ Actualizar URLs de redes sociales reales */}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-body text-white/30 text-xs">
            © {year} Gioval Medicina Estética. Todos los derechos reservados.
          </p>
          <a href="#" className="font-body text-white/30 text-xs hover:text-white/60 transition-colors">
            Aviso de privacidad
          </a>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Add to App.jsx after AppointmentSection**

```jsx
import Footer from './components/Footer'
// ... after <AppointmentSection />
<Footer />
```

- [ ] **Step 3: Commit**

```bash
cd ~/gioval-landing
git add src/components/Footer.jsx src/App.jsx
git commit -m "feat: Footer — 4-col dark with contact, services, socials"
```

---

## Task 13: App.jsx Final Assembly

**Files:**
- Modify: `~/gioval-landing/src/App.jsx`

- [ ] **Step 1: Replace App.jsx with final assembly**

```jsx
import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Services'
import About from './components/About'
import Testimonials from './components/Testimonials'
import Gallery from './components/Gallery'
import AppointmentSection from './components/AppointmentSection'
import AppointmentModal from './components/AppointmentModal'
import WhatsAppButton from './components/WhatsAppButton'
import Footer from './components/Footer'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const openModal  = () => setModalOpen(true)
  const closeModal = () => setModalOpen(false)

  return (
    <div className="bg-gioval-crema">
      <Navbar onAgendarClick={openModal} />
      <Hero onAgendarClick={openModal} />
      <Services />
      <About />
      <Testimonials />
      <Gallery />
      <AppointmentSection onAgendarClick={openModal} />
      <Footer />

      <AppointmentModal open={modalOpen} onClose={closeModal} />
      <WhatsAppButton />
    </div>
  )
}
```

- [ ] **Step 2: Full visual review**

Run `npm run dev`. Recorrer toda la landing:
- Navbar transparente en hero → opaco al scrollear
- Hero: headline editorial, stats bar, 2 CTAs
- Services: 8 cards numeradas, hover carbon + acento
- About: 2 columnas, pull quote malva
- Testimonials: 3 cards con estrellas
- Gallery: grid con gradientes GIOVAL
- AppointmentSection: gradiente malva-carbon
- Footer: dark carbon 4 columnas
- Modal: abre desde navbar y CTAs, Escape cierra
- WhatsApp: botón flotante bottom-right

- [ ] **Step 3: Check mobile (375px)**

En DevTools → 375px. Verificar: sin overflow horizontal, navbar hamburger funciona, hero text legible, grid de servicios 1-col.

- [ ] **Step 4: Commit**

```bash
cd ~/gioval-landing
git add src/App.jsx
git commit -m "feat: App.jsx final assembly — all sections wired with modal state"
```

---

## Task 14: Elys Backend — Migration + Public API

**Files:**
- Create: `~/elys/backend/src/db/migrations/022_solicitudes_cita.sql`
- Create: `~/elys/backend/src/controllers/solicitudesPublicController.js`
- Create: `~/elys/backend/src/routes/public.js`
- Modify: `~/elys/backend/src/index.js`

- [ ] **Step 1: Create migration**

```bash
cat > ~/elys/backend/src/db/migrations/022_solicitudes_cita.sql << 'EOF'
-- Solicitudes de cita desde la landing page pública
CREATE TABLE IF NOT EXISTS solicitudes_cita (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  apellido       VARCHAR(100) NOT NULL,
  telefono       VARCHAR(30)  NOT NULL,
  email          VARCHAR(150),
  servicio       VARCHAR(200),
  fecha_preferida DATE,
  notas          TEXT,
  estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente', 'contactada', 'convertida', 'cancelada')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF
```

- [ ] **Step 2: Apply migration to local DB**

```bash
cd ~/elys && docker compose up -d
sleep 3
docker exec -i elys-postgres psql -U elys_user -d elys < backend/src/db/migrations/022_solicitudes_cita.sql
```

Expected: `CREATE TABLE`

- [ ] **Step 3: Create public controller**

```js
// ~/elys/backend/src/controllers/solicitudesPublicController.js
const pool = require('../db/pool')

async function crearSolicitud(req, res) {
  const { nombre, apellido, telefono, email, servicio, fecha_preferida, notas } = req.body

  if (!nombre?.trim() || !apellido?.trim() || !telefono?.trim()) {
    return res.status(400).json({ error: 'nombre, apellido y telefono son requeridos' })
  }

  const { rows } = await pool.query(
    `INSERT INTO solicitudes_cita (nombre, apellido, telefono, email, servicio, fecha_preferida, notas)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, nombre, apellido, created_at`,
    [
      nombre.trim(),
      apellido.trim(),
      telefono.trim(),
      email?.trim() || null,
      servicio?.trim() || null,
      fecha_preferida || null,
      notas?.trim() || null,
    ]
  )

  res.status(201).json({ ok: true, message: 'Solicitud recibida', solicitud: rows[0] })
}

async function listarSolicitudes(req, res) {
  const { estado } = req.query
  const where  = estado ? `WHERE estado = $1` : ''
  const params = estado ? [estado] : []
  const { rows } = await pool.query(
    `SELECT * FROM solicitudes_cita ${where} ORDER BY created_at DESC LIMIT 100`,
    params
  )
  res.json(rows)
}

async function actualizarEstado(req, res) {
  const { id } = req.params
  const { estado } = req.body
  const valid = ['pendiente', 'contactada', 'convertida', 'cancelada']
  if (!valid.includes(estado)) return res.status(400).json({ error: 'estado inválido' })
  const { rows } = await pool.query(
    `UPDATE solicitudes_cita SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [estado, id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Solicitud no encontrada' })
  res.json(rows[0])
}

module.exports = { crearSolicitud, listarSolicitudes, actualizarEstado }
```

- [ ] **Step 4: Create public routes**

```js
// ~/elys/backend/src/routes/public.js
const router = require('express').Router()
const { crearSolicitud } = require('../controllers/solicitudesPublicController')

// POST /api/public/solicitudes — sin autenticación
router.post('/solicitudes', crearSolicitud)

module.exports = router
```

- [ ] **Step 5: Register route + update CORS in `index.js`**

Open `~/elys/backend/src/index.js`. Find the `cors()` call and the routes block. Make two changes:

**Change 1 — Update CORS to allow landing page origin:**
```js
// Find: app.use(cors(...))
// Replace with:
app.use(cors({
  origin: [
    'http://localhost:5173',           // gioval-landing dev
    'http://localhost:3000',
    'http://62.238.3.136:8089',        // gioval-landing prod
    /^http:\/\/62\.238\.3\.136/,       // cualquier puerto en el servidor
  ],
  credentials: true,
}))
```

**Change 2 — Register public routes (BEFORE the auth middleware):**
```js
// Find the line that registers the first authenticated route (e.g., app.use('/api/usuarios', ...))
// ADD BEFORE it:
const publicRoutes = require('./routes/public')
app.use('/api/public', publicRoutes)
```

- [ ] **Step 6: Restart backend and test endpoint**

```bash
cd ~/elys/backend && npm run dev &
sleep 2
curl -s -X POST http://localhost:3008/api/public/solicitudes \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","apellido":"García","telefono":"4421234567","servicio":"01 · Medicina Estética"}' \
  | python3 -m json.tool
```

Expected:
```json
{
    "ok": true,
    "message": "Solicitud recibida",
    "solicitud": {
        "id": 1,
        "nombre": "Ana",
        "apellido": "García",
        "created_at": "..."
    }
}
```

- [ ] **Step 7: Commit Elys backend changes**

```bash
cd ~/elys
git add backend/src/db/migrations/022_solicitudes_cita.sql \
        backend/src/controllers/solicitudesPublicController.js \
        backend/src/routes/public.js \
        backend/src/index.js
git commit -m "feat: public solicitudes API — migration 022, POST /api/public/solicitudes, CORS update"
```

---

## Task 15: Elys Frontend — SolicitudesTab

**Files:**
- Create: `~/elys/frontend/src/api/solicitudes.js`
- Create: `~/elys/frontend/src/components/citas/SolicitudesTab.jsx`
- Modify: `~/elys/frontend/src/pages/CitasPage.jsx`

- [ ] **Step 1: Create API helper**

```js
// ~/elys/frontend/src/api/solicitudes.js
import api from './index'  // usa el axios/fetch instance existente del proyecto

export async function getSolicitudes(estado) {
  const url = estado ? `/solicitudes-admin?estado=${estado}` : '/solicitudes-admin'
  const res = await api.get(url)
  return res.data
}

export async function updateEstado(id, estado) {
  const res = await api.patch(`/solicitudes-admin/${id}/estado`, { estado })
  return res.data
}
```

> Nota: la ruta `/solicitudes-admin` requiere auth. Agregar en `index.js` del backend:
> ```js
> const { listarSolicitudes, actualizarEstado } = require('./controllers/solicitudesPublicController')
> router.get('/solicitudes-admin',        requireRol('admin'), listarSolicitudes)
> router.patch('/solicitudes-admin/:id/estado', requireRol('admin'), actualizarEstado)
> ```
> Agregar esto en `~/elys/backend/src/routes/` o directamente en `index.js` junto a las otras rutas admin.

- [ ] **Step 2: Agregar rutas admin de solicitudes en index.js del backend**

Open `~/elys/backend/src/index.js`. After the public routes registration, add:

```js
const { listarSolicitudes, actualizarEstado } = require('./controllers/solicitudesPublicController')
const { authenticateToken } = require('./middleware/auth')
const { requireRol }        = require('./middleware/roles')

app.get('/api/solicitudes-admin',
  authenticateToken, requireRol('admin'),
  listarSolicitudes
)
app.patch('/api/solicitudes-admin/:id/estado',
  authenticateToken, requireRol('admin'),
  actualizarEstado
)
```

- [ ] **Step 3: Create SolicitudesTab component**

```jsx
// ~/elys/frontend/src/components/citas/SolicitudesTab.jsx
import { useEffect, useState } from 'react'
import { getSolicitudes, updateEstado } from '../../api/solicitudes'

const ESTADOS = ['pendiente', 'contactada', 'convertida', 'cancelada']
const BADGE = {
  pendiente:  'bg-yellow-100 text-yellow-800',
  contactada: 'bg-blue-100 text-blue-800',
  convertida: 'bg-green-100 text-green-800',
  cancelada:  'bg-gray-100 text-gray-500',
}

export default function SolicitudesTab() {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filtro,      setFiltro]      = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await getSolicitudes(filtro || undefined)
      setSolicitudes(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filtro])

  const cambiarEstado = async (id, estado) => {
    await updateEstado(id, estado)
    load()
  }

  return (
    <div className="p-4">
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-gray-600">Filtrar:</span>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="border border-gray-200 rounded px-3 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <span className="text-xs text-gray-400">{solicitudes.length} solicitudes</span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>}

      {!loading && solicitudes.length === 0 && (
        <p className="text-sm text-gray-400 py-8 text-center">No hay solicitudes{filtro ? ` con estado "${filtro}"` : ''}.</p>
      )}

      {!loading && solicitudes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Servicio</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha pref.</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Recibida</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{s.nombre} {s.apellido}</td>
                  <td className="py-3 px-2">
                    <a href={`tel:${s.telefono}`} className="text-blue-600 hover:underline">{s.telefono}</a>
                  </td>
                  <td className="py-3 px-2 text-gray-600 max-w-[160px] truncate">{s.servicio || '—'}</td>
                  <td className="py-3 px-2 text-gray-600">
                    {s.fecha_preferida ? new Date(s.fecha_preferida).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <select
                      value={s.estado}
                      onChange={e => cambiarEstado(s.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded font-medium border-0 cursor-pointer ${BADGE[s.estado]}`}
                    >
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-2 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add "Solicitudes" tab to CitasPage**

Open `~/elys/frontend/src/pages/CitasPage.jsx`. Find the tabs array and add:

```jsx
// Agregar import al inicio del archivo:
import SolicitudesTab from '../components/citas/SolicitudesTab'

// En el array de tabs (busca el pattern de tabs existente):
// Agregar al final de los tabs:
{ id: 'solicitudes', label: 'Solicitudes Landing' }

// En el switch/conditional de render de tabs, agregar:
// {activeTab === 'solicitudes' && <SolicitudesTab />}
```

- [ ] **Step 5: Verify in Elys admin**

```bash
cd ~/elys/frontend && npm run dev
```

Login como admin@elys.com → Citas → ver tab "Solicitudes Landing" → tabla vacía o con datos de prueba.

- [ ] **Step 6: Commit**

```bash
cd ~/elys
git add frontend/src/api/solicitudes.js \
        frontend/src/components/citas/SolicitudesTab.jsx \
        frontend/src/pages/CitasPage.jsx \
        backend/src/index.js
git commit -m "feat: SolicitudesTab en CitasPage — admin puede ver y gestionar solicitudes de la landing"
```

---

## Task 16: Build + Nginx Deploy

**Files:**
- Create: `~/gioval-landing/deploy.sh`
- Nginx config on server: `/etc/nginx/sites-available/gioval-landing`

- [ ] **Step 1: Create deploy.sh**

```bash
cat > ~/gioval-landing/deploy.sh << 'EOF'
#!/usr/bin/env bash
set -e

SERVER="root@62.238.3.136"
REMOTE_DIR="/root/gioval-landing"

echo "▶ Building gioval-landing..."
cd ~/gioval-landing
npm run build

echo "▶ Syncing to server..."
rsync -avz --delete dist/ $SERVER:$REMOTE_DIR/dist/

echo "▶ Setting up Nginx on server..."
ssh $SERVER "
  # Create nginx config if not exists
  if [ ! -f /etc/nginx/sites-available/gioval-landing ]; then
    cat > /etc/nginx/sites-available/gioval-landing << 'NGINX'
server {
    listen 8089;
    server_name _;
    root /root/gioval-landing/dist;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control \"public, immutable\";
    }
}
NGINX
    ln -sf /etc/nginx/sites-available/gioval-landing /etc/nginx/sites-enabled/
    ufw allow 8089/tcp
  fi
  nginx -t && systemctl reload nginx
  echo '✓ Nginx configured on port 8089'
"

echo "✓ Deploy gioval-landing completado"
echo "  URL: http://62.238.3.136:8089"
EOF
chmod +x ~/gioval-landing/deploy.sh
```

- [ ] **Step 2: Update `.env` with production API URL**

```bash
echo "VITE_API_URL=http://62.238.3.136:3008" > ~/gioval-landing/.env.production
```

- [ ] **Step 3: Build and deploy**

```bash
cd ~/gioval-landing
npm run build 2>&1 | tail -5
./deploy.sh
```

Expected: `✓ Deploy gioval-landing completado` + `URL: http://62.238.3.136:8089`

- [ ] **Step 4: Apply migration 022 in production**

```bash
ssh root@62.238.3.136 "docker exec -i elys-postgres psql -U elys_user -d elys" < ~/elys/backend/src/db/migrations/022_solicitudes_cita.sql
```

Expected: `CREATE TABLE`

- [ ] **Step 5: Deploy Elys backend with new routes**

```bash
cd ~/elys && ./deploy.sh
```

- [ ] **Step 6: Smoke test in production**

```bash
# Test public endpoint
curl -s -X POST http://62.238.3.136:3008/api/public/solicitudes \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","apellido":"Prod","telefono":"1234567890"}' \
  | python3 -m json.tool

# Test landing page loads
curl -s -o /dev/null -w "%{http_code}" http://62.238.3.136:8089
```

Expected: `{"ok":true,...}` + `200`

- [ ] **Step 7: Final commit**

```bash
cd ~/gioval-landing
git add deploy.sh .env.production
git commit -m "feat: deploy script — Nginx port 8089, rsync dist/, migration 022 prod"
```

---

## Post-Launch Checklist

Before sharing with the Dra. Giovanna:

- [ ] Reemplazar `521XXXXXXXXXX` con el número real de WhatsApp en `AppointmentModal.jsx`, `AppointmentSection.jsx` y `WhatsAppButton.jsx`
- [ ] Reemplazar teléfono, email y dirección reales en `Footer.jsx`
- [ ] Actualizar URLs de Instagram y Facebook en `Footer.jsx`
- [ ] Reemplazar gradiente del Hero con foto real: cambiar `background: 'linear-gradient...'` por `backgroundImage: 'url(/hero.jpg)'` + overlay div
- [ ] Reemplazar placeholder de Dra. Giovanna en `About.jsx` con foto real
- [ ] Reemplazar gradientes en `Gallery.jsx` con fotos reales
- [ ] Actualizar stats bar en `Hero.jsx` con números reales (pacientes, años)
- [ ] Verificar el logo SVG — considerar exportar el vector real del brandbook PDF
- [ ] Completar textos con el contenido real que tiene disponible el cliente
- [ ] Aplicar migración 022 en producción (Task 16 Step 4)
