# Design — Portafolio José Manuel Sánchez

**Versión:** 1.0 · **Fecha:** 4 de septiembre de 2026

---

## Stack

| Capa | Elección | Versión |
|---|---|---|
| Framework | Astro | 7.3.1 |
| CSS | Tailwind CSS | 4.3.3 |
| Animación | GSAP + ScrollTrigger | 3.15.0 |
| Smooth scroll | Lenis | 1.3.26 |
| Build | Vite (incluido en Astro) | — |
| Hosting | Vercel | — |

**Versiones verificadas contra el registro de npm el 4 de septiembre de 2026.**

⚠️ **Advertencia honesta:** mi conocimiento de la API de Astro llega hasta la versión 5.
Astro 7 es posterior, así que la sintaxis exacta de `astro.config.mjs` —sobre todo la
configuración de i18n— debe verificarse contra la documentación oficial antes de darla
por buena. Lo que sigue refleja la API que conozco y puede necesitar ajuste.

### Estrategia de Tailwind

Tailwind 4 se configura desde CSS, no desde `tailwind.config.js`. Los design tokens se
declaran una sola vez con `@theme` y Tailwind genera las utilidades correspondientes,
además de exponerlos como custom properties para el CSS que se escriba a mano.

Se instala con `@tailwindcss/vite`, no con el paquete PostCSS ni con la integración de
Astro para Tailwind 3.

**Dónde se usa Tailwind y dónde no:**

| Se resuelve con utilidades | Se resuelve con CSS propio |
|---|---|
| Layout, flex, grid, gaps | El fondo interactivo (máscaras, canvas, keyframes) |
| Espaciado y tamaños del sistema | Las cuatro paletas de sector |
| Colores, tipografía y radios del tema | Los mocks del escenario |
| Estados `hover:` y `focus-visible:` | El overlay de grano |
| Breakpoints | Secuencias de GSAP |

**Regla:** nada de `@apply` para inventar componentes. Si un patrón se repite, se
convierte en componente `.astro`, no en una clase de utilidad compuesta — que es el
camino directo a un CSS que nadie entiende seis meses después.

### Nota sobre Lenis

La librería se publica ahora como `lenis`, no como `@studio-freight/lenis`.
El paquete antiguo está descontinuado.

---

## Arquitectura de archivos

```
portafolio/
├── public/
│   ├── fonts/                    # .woff2 auto-alojadas
│   ├── img/
│   │   └── demos/                # capturas de los demos de sector
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── MobileNav.astro
│   │   ├── Hero.astro
│   │   ├── SectorStage.astro     # el escenario rotatorio
│   │   ├── WorkGrid.astro
│   │   ├── WorkCard.astro
│   │   ├── ServiceList.astro
│   │   ├── ClosingBlock.astro
│   │   ├── Footer.astro
│   │   └── LangToggle.astro
│   ├── layouts/
│   │   └── Base.astro            # head, meta, hreflang, grano, scripts
│   ├── i18n/
│   │   ├── es.json
│   │   ├── en.json
│   │   └── utils.ts              # helper t() y resolución de ruta
│   ├── data/
│   │   └── sectors.ts            # paletas, textos y mocks de los cuatro oficios
│   ├── pages/
│   │   ├── index.astro           # redirige a /es/
│   │   ├── es/
│   │   │   ├── index.astro
│   │   │   ├── proyectos.astro
│   │   │   ├── servicios.astro
│   │   │   └── contacto.astro
│   │   └── en/
│   │       ├── index.astro
│   │       ├── work.astro
│   │       ├── services.astro
│   │       └── contact.astro
│   ├── scripts/
│   │   ├── motion.ts             # Lenis + GSAP + reveals
│   │   ├── stage.ts              # lógica del escenario
│   │   └── nav.ts                # menú móvil
│   └── styles/
│       ├── global.css            # @import tailwind + @theme con los tokens
│       ├── background.css        # fondo interactivo
│       └── sectors.css           # paletas de los cuatro oficios
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## Design tokens

Se declaran con `@theme` en `global.css`. Tailwind genera las utilidades (`bg-bg`,
`text-text-1`, `border-rule`, `font-display`…) y a la vez los deja disponibles como
custom properties para el CSS escrito a mano.

```css
@import "tailwindcss";

@theme{
  /* Colores base */
  --color-bg:        #12100E;
  --color-surface:   #1A1714;
  --color-surface-2: #221E1A;
  --color-text-1:    #F2EDE4;
  --color-text-2:    #93897C;
  --color-rule:      #2E2822;
  --color-accent:    #E0A200;
  --color-accent-ink:#12100E;

  /* Tipografía */
  --font-display: "Bricolage Grotesque", "Trebuchet MS", sans-serif;
  --font-body:    "Instrument Sans", system-ui, sans-serif;

  --size-h1:      clamp(2.6rem, 7.4vw, 5.6rem);
  --size-h2:      clamp(1.75rem, 3.6vw, 2.6rem);
  --size-h2-lg:   clamp(1.9rem, 4.4vw, 3.1rem);
  --size-h3:      1.22rem;
  --size-body:    clamp(1rem, .95rem + .2vw, 1.0625rem);
  --size-lede:    1.075rem;
  --size-small:   .94rem;
  --size-meta:    .84rem;

  --lh-display: 1.04;
  --lh-body:    1.65;
  --track-display: -.028em;

  /* Espaciado — escala de 8px */
  --space-2xs: .5rem;
  --space-xs:  1rem;
  --space-sm:  1.5rem;
  --space-md:  2rem;
  --space-lg:  3rem;
  --space-xl:  4rem;
  --space-2xl: 6rem;

  --section-y: clamp(3.5rem, 8vw, 6.5rem);

  /* Layout */
  --container-max: 78rem;
  --container-pad: clamp(1.25rem, 5vw, 4.5rem);
  --measure: 34rem;
  --radius-sm: 3px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Movimiento */
  --ease: cubic-bezier(.22,.61,.36,1);
  --dur-fast:   .2s;
  --dur-mid:    .3s;
  --dur-reveal: .7s;
}
```

**Paletas de sector** en `sectors.css`, como clases con sus propias variables locales.
No heredan del sistema global — esa separación es intencional.

---

## Fondo interactivo

El fondo no es un color plano. Es una capa fija bajo el contenido que reacciona al
cursor y da la sensación de material iluminado en vez de superficie impresa.

**Opción elegida: B · Retícula viva.** ✅

Una malla de puntos dibujada en canvas 2D. Cerca del cursor los puntos crecen, se
apartan del centro y viran del hueso al acento; lejos vuelven a su posición y a una
opacidad baja. Da la lectura de un material vivo bajo la superficie sin recurrir a 3D.

| Opción | Técnica | Coste | Móvil |
|---|---|---|---|
| A · Luz de taller | Gradientes siguiendo al puntero más retícula con `mask-image` | Muy bajo | Estático |
| **B · Retícula viva** ✅ | Canvas 2D con puntos reactivos al cursor | Medio — repinta cada frame | Puntos estáticos |
| C · Deriva lenta | Manchas desenfocadas animadas en CSS | Bajo | Idéntico |

### Restricciones de implementación

Es la opción más costosa de las tres, así que necesita un presupuesto de rendimiento
explícito. Si alguno de estos límites se rompe, se degrada a la opción A.

- **Separación de la malla:** 34px. Con menos, el número de puntos se dispara sin que
  se note la diferencia.
- **Radio de influencia:** 150px alrededor del cursor.
- **`devicePixelRatio` limitado a 2.** En pantallas 3x el coste se triplica sin ganancia visible.
- **Interpolación del puntero**, no posición directa. El retardo es lo que lo hace ver
  caro en vez de nervioso.
- **El bucle se detiene** cuando la pestaña pierde visibilidad (`visibilitychange`) y
  cuando el canvas sale del viewport (`IntersectionObserver`).
- **Solo con `(pointer: fine)`.** En táctil se pinta una vez la malla en reposo y no se
  instancia bucle alguno.
- **Bajo `prefers-reduced-motion`,** malla estática sin `requestAnimationFrame`.
- **Recalcular la malla en `resize` con debounce** de 150ms, no en cada evento.
- **Presupuesto:** el bucle debe mantenerse por debajo de 4ms por frame en un portátil
  de gama media. Medir con el panel de rendimiento antes de dar la fase por cerrada.

### Reglas comunes

- Capa `position: fixed`, `z-index: 0`, `pointer-events: none`. El contenido en `z-index: 2`.
- El grano se mantiene por encima del fondo.
- **Piso de legibilidad:** ninguna posición del cursor puede bajar el contraste del
  texto por debajo de AA. Si hay que subir la opacidad de las superficies para
  compensar, el efecto se descarta.
- Las superficies elevadas sobre el fondo usan `color-mix` con transparencia y
  `backdrop-filter`, para que la malla se intuya debajo sin comprometer la lectura.

---

## Convenciones

- **CSS:** BEM — `bloque__elemento--modificador`
- **JS/TS:** camelCase para funciones y variables, PascalCase para clases y componentes
- **Archivos:** kebab-case, salvo componentes `.astro` en PascalCase
- **Componentes Astro:** sin JavaScript de cliente salvo que sea imprescindible;
  los scripts se cargan con `<script>` de Astro, que se agrupa y optimiza solo

---

## Estrategia de animaciones

**GSAP + ScrollTrigger** se encarga de las entradas por scroll y la secuencia del hero.
**Lenis** aporta la inercia del scroll y se sincroniza con ScrollTrigger en el mismo `raf`.

```js
import Lenis from 'lenis'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!reduced) {
  const lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
  const raf = time => { lenis.raf(time); ScrollTrigger.update(); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)
}

gsap.defaults({ ease: 'power3.out', duration: .7 })
```

**Curvas del proyecto:**
- Entradas: `power3.out` ≈ `cubic-bezier(.22,.61,.36,1)`
- Hover: 200 ms, misma curva
- Cross-fade del escenario: 500 ms lineal en opacidad

**Regla de contención:** si `prefers-reduced-motion` está activo, Lenis no se instancia,
ScrollTrigger no se registra, los elementos quedan visibles y el escenario no rota.
El sitio debe ser íntegramente usable en ese modo.

**El escenario de sectores no usa GSAP.** Es un cross-fade en CSS con un temporizador
en JS puro — más liviano y sin dependencia crítica.

---

## Estrategia de imágenes

- Capturas de demos en WebP, con `srcset` a 640/960/1440
- Componente `<Image>` de Astro para optimización en build
- `loading="lazy"` y `decoding="async"` en todo salvo el hero
- `width` y `height` explícitos para evitar layout shift
- Las miniaturas del grid en `aspect-ratio: 16/10`, recortadas al mismo encuadre

---

## Estrategia de fuentes

- Auto-alojadas en `public/fonts/` como `.woff2`, subconjunto latino + latino extendido
- `font-display: swap` con `size-adjust` calibrado para evitar salto
- Precarga solo del peso de la display usado en el H1
- **Verificar Ñ, tildes y signos de apertura (¿ ¡) en ambas familias**

---

## SEO e i18n

- Rutas separadas por idioma, sin detección automática ni redirección forzada
- `hreflang` recíproco entre cada par de páginas equivalentes, más `x-default`
- Títulos y descripciones traducidos, no generados por plantilla
- Sitemap con ambas versiones
- Datos estructurados `Person` + `ProfessionalService` en la home
