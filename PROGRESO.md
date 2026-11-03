# Progreso del portafolio

Estado al 3 de noviembre de 2026, rama `cinematic-react`. Todavía no hay commits
de este trabajo.

Plan aprobado: https://claude.ai/artifact/Wc3183KmKrBjUs25RwWoow

## Hecho

### Preparación y Fase 3: estructura base
- Node instalado y carpeta conectada a `github.com/Sanchez-Fk/Portafolio`.
- Vite y React con prerender: sin JavaScript, el sitio se lee entero.
- El sitio anterior quedó intacto en `legacy/`.
- Tokens Deep Space, fondo de estrellas en CSS, header, menú móvil, indicador de
  sección y todas las secciones con el contenido del CV.
- Lumina Dev, Servicios y Proceso retirados del sitio.

### Fase 4.1: intro sin WebGL y rostro de estrellas
- **Rostro de estrellas en el hero.** Reemplaza al planeta. Sale de la selfie
  frontal sobre pared blanca y es plano y quieto: no gira ni sigue al puntero, solo
  titila. La nariz está algo reducida para compensar la cámara frontal. La foto no
  se publica, solo las posiciones (`src/scene/faceStars.js`, en un chunk aparte).
  - Se genera con `node scripts/face-stars.mjs selfie.jpg`, que necesita ffmpeg.
    Usa punteado de Poisson y relajación de Lloyd: 9.000 estrellas en escritorio
    y 5.200 en móvil.
- **Intro de 28 s (25 s en móvil):** nombre, crawl en perspectiva, aceleración,
  hipervelocidad, estrellas que se juntan en el rostro y entrada del hero sin corte.
- **Cuándo corre la intro:**
  - Corre sola solo en la primera visita de la sesión.
  - No corre con un enlace directo (`/#proyectos`) ni con movimiento reducido.
  - Se salta con el botón, con Esc o al hacer scroll.
  - En el pie hay un botón "Ver intro" y un interruptor "No mostrar más".
  - Con movimiento reducido, "Ver intro" muestra una versión solo con fundidos.
- Un script en `index.html` tapa la página antes del primer pintado para que el hero
  no asome. Se retira solo a los 4 s aunque el JS no llegue.
- Textos en español e inglés.
- **Verificado en navegador sin interfaz:**
  - Compila y prerenderiza sin errores.
  - Capturas a 1440 y 390 px.
  - Funcionan saltar con Esc y con la rueda, la segunda visita, el enlace directo,
    el movimiento reducido, "Ver intro", "No mostrar más" y la lectura sin JS.
  - El único error de consola es el CORS de Flowy en localhost.

### Fase 4.3: intro de editor y hero Nocturne (Claude Design, ronda 2)
- Sustituye a la Fase 4.1. El rostro de estrellas, el crawl y Deep Space salen del
  sitio; su código quedó en `legacy/rostro-estrellas/` porque nunca tuvo commit.
- **Intro (variante 2b):** un editor escribe `jose.ts` y espera. Solo se entra con
  Enter o con el botón «entrar ↩» (en táctil). Un Enter durante la escritura la
  completa; el siguiente abre el sitio. Las reglas de cuándo corre no cambian.
- **Hero (variante 2c):** nombre enorme que sube desde una máscara, letras que se
  levantan al pasar el puntero, presentación y dos caminos numerados (CV y
  WhatsApp).
- Paleta, radios y elevación de Nocturne en `tokens.css`; Instrument Serif fuera.
- Portada real de Flowy (`src/assets/projects/flowy.webp`).
- Sin Lumina Dev: el sitio va a nombre de José Manuel.
- Verificado a 1440 y 390 px: escritura, espera, Enter, botón, sin scroll lateral.
  Único error de consola: el CORS de Flowy en localhost.

### Fase 4.4: espiral de Habilidades y CV
- Las habilidades salen del centro de una en una, en orden revuelto, y giran hasta su sitio con el
  scroll. En escritorio (≥1024×720) la rejilla se fija mientras dura; en
  pantallas menores cada grupo hace su propia espiral. Sin movimiento, la lista
  se ve ordenada desde el HTML.
- CV y sitio: inglés A2 completado, cursando B1. La fuente del PDF vive ahora en
  `cv-fuente/` (HTML + Carlito); se imprime con Brave headless a carta.
- Idea propuesta, sin decidir: rama neuronal en el margen que crece con el scroll
  y enciende un nodo en cada sección (versión ligera, sin WebGL).

## Pendiente

### Lo que tiene que revisar José Manuel
- [ ] La intro del editor y el hero nuevo, en su pantalla y en su teléfono.
- [ ] La tira de proyectos del hero (2c) espera a que existan los prototipos.

### Problemas conocidos
- [ ] Al abrir `/#proyectos`, la página no siempre queda en el mismo punto. Parece
      venir del carrusel horizontal y no de la intro. Falta investigarlo.
- [ ] El JS inicial pesa 134 KB comprimido; el objetivo del plan es 120 KB.
- [ ] Comprobar en producción que la API de Flowy acepta el dominio (en localhost
      la bloquea CORS).

### Fase 5: contenido y proyectos
- [ ] Captura real de Spartan. La de Flowy ya está.
- [ ] Enlace de Spartan, si existe.
- [ ] Revisar textos contra el CV y probar todos los enlaces.

### Hito V1
- [ ] José Manuel revisa el sitio completo, también en su teléfono, antes de seguir.

### Fase 6: optimización, accesibilidad y pruebas
- [ ] Medir contra los objetivos: LCP, CLS, INP y FPS.
- [ ] Revisión WCAG AA, recorrido con teclado y con lector de pantalla.
- [ ] SEO: imagen Open Graph y canonical. Servir las fuentes desde el propio dominio.
- [ ] Pruebas en un teléfono real.
- [ ] Borrar `legacy/` y publicar. Cada paso necesita aprobación por separado.

### Proyectos nuevos para la vitrina
Prototipos web funcionales que se añadirán como proyectos. Ninguno está creado
todavía.
- [ ] Restaurante
- [ ] Odontología
- [ ] Tienda de música
- [ ] Otros que José Manuel indique
