# Portafolio — José Manuel Sánchez Marín

Experiencia web cinematográfica con React y Vite. Universo Deep Space: la intro es
el viaje hacia la Tierra y el scroll es la órbita, de la noche del hero al amanecer
de Contacto.

Lo hecho y lo pendiente está en [PROGRESO.md](PROGRESO.md).

## Comandos

```bash
npm install
npm run dev       # desarrollo en http://localhost:5173
npm run build     # compila y prerenderiza en dist/
npm run preview   # sirve dist/ en http://localhost:4173
```

`?motion=force` activa el movimiento sin guardar nada, para desarrollo.

## Estructura

```
index.html            Plantilla. Metadatos, fuentes y widget de Flowy
scripts/prerender.mjs Escribe el HTML real en dist/index.html
scripts/face-stars.mjs Genera src/scene/faceStars.js desde la selfie frontal
public/               CV, fotos y favicon, servidos tal cual
src/
  entry-client.jsx    Hidrata el HTML prerenderizado
  entry-server.jsx    Genera ese HTML
  App.jsx             Compone la página
  data/site.js        Contacto, secciones, proyectos y habilidades
  i18n/               es.json y en.json
  hooks/              useI18n, useMotion
  lib/                env.js, raf.js, magnetic.js, gsap.js
  experience/         Intro (IntroLayer) y cuándo se reproduce (introStore)
  scene/              Deep Space sin WebGL (SceneFallback) y rostro de estrellas (FaceStars)
  components/         Header y menú móvil, indicador de viaje, Reveal
  sections/           Hero, About, Projects, Skills, Contact, SiteFooter
  styles/             tokens, reset, base, atmosphere, layout, components, sections
legacy/               Sitio anterior intacto, con su README. No se compila.
```

## Intro y rostro de estrellas

La intro dura 28 s (25 en móvil): nombre, crawl, hipervelocidad y estrellas que se
juntan en el rostro del hero. Corre sola solo en la primera visita de la sesión,
sin enlace directo y con movimiento activo. Se salta con el botón, Esc o la rueda.
El pie tiene "Ver intro" y un interruptor para no mostrarla más. Con movimiento
reducido, "Ver intro" muestra una versión con fundidos.

Un script en `index.html` tapa la página antes del primer pintado cuando la intro
va a correr. Sus reglas son copia de `src/experience/introStore.js`: si cambias
unas, cambia las otras.

El rostro sale de la selfie frontal, que no se publica:

```bash
node scripts/face-stars.mjs ruta/a/selfie.jpg   # necesita ffmpeg
```

## Añadir un proyecto

1. Agrega un objeto a `projects` en `src/data/site.js`. `url` es opcional: sin ella
   el título no es un enlace. No uses marcadores provisionales como destino.
2. Agrega `work.<id>.type` y `work.<id>.desc` en `es.json` y `en.json`.

Con tres proyectos o más, el carrusel horizontal se activa solo en escritorio con
ratón. En táctil y con movimiento reducido la lista sigue vertical.

Las portadas actuales son provisionales y lo dicen en pantalla.

## Reglas del proyecto

- **Sin JS el sitio se lee entero.** Por eso se prerenderiza. Nada de contenido
  inyectado solo en el cliente. El menú móvil tiene su respaldo en las anclas del pie.
- **El estado oculto lo pone JS, nunca el CSS.** Si GSAP falla, el contenido se ve.
- **`fromTo`, nunca `from`.** `ScrollTrigger.refresh()` puede releer el estado inicial
  como destino y dejar el texto invisible para siempre.
- **No usar `once: true` en los triggers de aparición.** Puede congelar el elemento en
  su estado inicial. `toggleActions` consigue lo mismo.
- **SplitText altera el DOM que React controla.** `SplitHeading` se remonta con
  `key={lang}` para partir el texto traducido desde cero.
- **Ninguna retirada de pantalla puede depender solo de GSAP.** `lagSmoothing` puede
  alargar una animación de 1,4 s a decenas de segundos en un equipo ahogado. Usa un
  `setTimeout` como cerrojo; aplica a la intro de la Fase 4.
- **Botones sin relleno de color, radios de 6 y 16px, sin elementos tipo HUD.** La luz y
  el degradado valen en atmósfera y reflejos, nunca en texto ni en botones.
- **`--c-accent` es el violeta seguro para texto.** `--c-accent-deep` y `--c-atmos` son
  luz: sobre el negro no alcanzan el contraste para texto pequeño.

## Movimiento

`prefers-reduced-motion` manda salvo que el visitante decida otra cosa con el
interruptor del pie, que se guarda en `localStorage` bajo `jms-motion`. El hook
`useMotion` hace que todo se reconstruya sin recargar.

## Créditos

Logos de [Simple Icons](https://simpleicons.org) (CC0). Fuentes Instrument Serif, Inter
y JetBrains Mono (OFL).
