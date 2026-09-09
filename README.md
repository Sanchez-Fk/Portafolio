# Portafolio — José Manuel Sánchez / Lumina Dev

Sitio de una sola página. HTML + CSS + JS vanilla, sin bundler ni paso de build.

## Levantarlo

```bash
python dev-server.py 5173
```

Luego abre `http://localhost:5173`. Hace falta un servidor (no vale abrir el
archivo directamente) porque los módulos ES y el `fetch` de `i18n/en.json`
no funcionan sobre `file://`.

`dev-server.py` es `http.server` con `Cache-Control: no-store`. Sin eso el
navegador se queda con CSS viejo mientras editas.

### Preferencia de movimiento

Hay tres estados, y se guardan en `localStorage` bajo `jms-motion`:

| Valor | Significado |
|---|---|
| ausente | sigue al sistema operativo — **por defecto** |
| `on` | el visitante activó el movimiento a mano |
| `off` | el visitante lo apagó a mano |

El sistema manda salvo que el visitante diga otra cosa desde el **interruptor
del footer**. Su decisión pesa más porque es más reciente y más específica: la
tomó en este sitio.

Eso significa que el sitio **sigue respetando `prefers-reduced-motion` por
defecto**. El interruptor no lo desactiva: solo permite cambiar de opinión.

Para desarrollo sigue existiendo `?motion=force`, que activa el movimiento sin
guardar nada:

```
http://localhost:5173/?motion=force
```

En CSS se traduce en dos clases sobre `<html>`, que pone `env.js`:

- `.motion-forced` anula el bloque de `prefers-reduced-motion`
- `.motion-off` lo aplica aunque el sistema no lo pida

Los valores reducidos están **duplicados a propósito** en `02-tokens.css` y
`01-reset.css`: CSS no permite compartir un bloque entre una media query y una
clase, y meter una variable intermedia lo volvía ilegible.

## Estructura

```
index.html            Único HTML. El español vive aquí, inline.
css/
  01-reset.css        Reset + prefers-reduced-motion global
  02-tokens.css       Sistema de diseño. Todo se cambia desde aquí.
  03-base.css         Elementos desnudos, foco, selección, scrollbar
  04-layout.css       Contenedores, rejilla, ritmo vertical
  05-components.css   Botones, marquee, toggle de idioma, preloader
  06-sections.css     Estilos propios de cada sección
  07-interactions.css Hover, magnetismo, estados de puntero
  08-canvas.css       El fondo con capas (rejilla, grano, bloom)
js/
  main.js             Orquestador
  modules/
    i18n.js           Toggle ES/EN
    motion.js         Interruptor de movimiento del footer
    magnetic.js       Botones magnéticos
    projects.js       Parallax de la imagen del proyecto
    reveals.js        Apariciones al hacer scroll (GSAP + split-type)
    horizontal.js     Carrusel horizontal de proyectos
  utils/
    env.js            Detección de entorno y lectura de tokens
    raf.js            Un solo requestAnimationFrame para todo el sitio
i18n/en.json          SOLO inglés (ver abajo)
tokens.html           Referencia visual del sistema. No es parte del sitio.
dev-server.py         Servidor estático sin caché
automation/           Prospección por WhatsApp con n8n. Ver automation/README.md
```

## Automatización de prospección

`automation/` es un proyecto aparte, sin relación con el sitio: el stack de
n8n + Evolution API + Postgres que lee la base de posibles clientes, les
escribe en frío por WhatsApp y sostiene la conversación hasta la llamada.

No se despliega con el portafolio y no comparte código con él. Instrucciones
completas en [automation/README.md](automation/README.md).

## Sistema de diseño

Sigue el sistema de **Resend**: lienzo negro absoluto (`#000000`), toda
separación de capas con hairlines de 1px en `#292D30` y nunca con sombras,
tipografía blanca, y un solo violeta de marca (`#9281F7`) reservado a código
e identificadores técnicos.

| Rol | Fuente | Sustituye a |
|---|---|---|
| Hero | Instrument Serif 400 | Domaine |
| Titulares y UI | Inter 400/500/600 | Inter + ABC Favorit |
| Código y etiquetas | JetBrains Mono 400 | Commit Mono |

Reglas que **no** hay que romper:

- Los botones nunca llevan relleno de color. Transparente, borde de 1px,
  texto blanco. La jerarquía se marca con el brillo del borde.
- Solo dos radios: **6px** para botones, badges e inputs; **16px** para
  tarjetas y ventanas de código. No se mezclan en una misma pieza.
- El violeta pertenece al código, a los badges de stack y a los números de
  sección. Nunca a un titular grande ni al relleno de un botón.
- Elevación con bordes, jamás con `box-shadow`.
- El titular de sección va a 56px en peso **400** con `-0.05em` de tracking.
  Ese apretón, no la negrita, es lo que le da presencia.

### La desviación deliberada: el fondo no es plano

Resend prohíbe expresamente gradientes y glows en el lienzo. Aquí se desvía
a propósito, con tres capas muy contenidas en `08-canvas.css`:

1. **Rejilla** de hairlines en el mismo `#292D30` de los bordes, con máscara
   radial para que se desvanezca. Es la extensión natural del lenguaje: si
   todo se separa con líneas de 1px, el fondo también.
2. **Grano** vía `feTurbulence` embebido — sin peticiones de red. Rompe el
   bandeado del negro y le da textura mate.
3. **Un bloom violeta**, solo detrás del hero. Si estuviera en todas las
   secciones dejaría de significar algo.

Las tres van en `position: fixed` detrás del contenido: no cuestan layout ni
repaints al hacer scroll. **Para volver al negro plano de Resend, quita el
`<link>` de `08-canvas.css`.** Nada más depende de él.

#### La rejilla reacciona al cursor

Con ratón, `js/modules/grid.js` sustituye la rejilla de CSS por un canvas que
dibuja la MISMA cuadrícula como polilíneas sobre una malla de puntos. Cada
punto se aparta del cursor con una caída cuadrática y las líneas, al pasar por
ellos, se curvan. Alrededor del puntero la rejilla se enciende en violeta.

En táctil y con `prefers-reduced-motion` el canvas no se crea y queda la
rejilla estática de CSS, que es idéntica.

**Tres cosas que costaron 145× el rendimiento — no las deshagas:**

1. La malla se construye **una vez por frame** con `Path2D` y se traza una
   sola vez. Recorrerla dos veces (una por color) duplicaba el coste.
2. El brillo del cursor es un `fillRect` con `globalCompositeOperation:
   'source-atop'` — solo pinta donde ya hay tinta, o sea encima de las
   líneas. **No** es un segundo trazado de toda la malla.
3. El desvanecido va horneado en el canvas con `destination-in`, **no** como
   `mask-image` de CSS: un elemento fijo a pantalla completa con máscara CSS
   obliga al navegador a recomponer la capa en cada frame.

Medido en 1440×820 con 228 puntos: **36,7 ms → 0,254 ms por frame.**

### Contraste

El sistema define `Charcoal #464A4D` para "texto que debe desaparecer en la
superficie". Sobre negro eso da **2.2:1** — ilegible. En este sitio solo se
usa en elementos `aria-hidden` decorativos. Cualquier etiqueta de contenido
real va en `--c-fg-muted` (8.4:1). El violeta sobre negro da 6.7:1, que pasa
AA para texto normal.

## Cómo funcionan las animaciones

- **Reveals**: `reveals.js` parte los `[data-split]` en líneas y palabras con
  split-type y las sube desde detrás de una máscara. Todo lo demás entra con
  un fade + translateY. Cada cosa dispara una vez y no se revierte al subir.
- **Carrusel horizontal**: solo a partir de 1024px. La sección de proyectos se
  fija y el scroll vertical mueve las tarjetas a lo ancho, 1px por 1px. En
  móvil se queda en vertical: secuestrar el scroll táctil es mala idea.
- **Stack**: rejilla con las 12 tecnologías visibles a la vez. Cada una flota
  con su propia duración y desfase (`--i` en el marcado) para que el conjunto
  se mueva como algo vivo y no como un bloque. Al pasar el ratón, el logo se
  para, toma su color de marca y los vecinos se atenúan.
- **Preloader**: el porcentaje es real. Cuenta fuentes, imágenes no diferidas
  y el evento `load` (que incluye GSAP y split-type del CDN). Lo único
  cosmético es el suavizado del número; no hay ni un milisegundo de espera
  artificial. Los reveals esperan a que termine: si se construyeran antes, el
  hero se animaría detrás del panel y nadie lo vería.

### El preloader nunca puede quedarse puesto

Tres cerrojos, y ninguno depende del bucle de animación:

1. Todo cargado → se da 1,2 s de margen a la cuenta y se cierra igualmente.
2. A los 6 s se cierra pase lo que pase (CDN caído, imagen rota).
3. La retirada del panel tiene su propio `setTimeout` de 2,4 s.

El tercero existe porque **GSAP trae `lagSmoothing` activado**: cuando un
frame tarda más de 500 ms, finge que solo pasaron 33 ms para que las
animaciones no den saltos. En un equipo ahogado eso convierte una salida de
1,4 s en decenas de segundos — y con ella se iba la retirada del panel. Medido
en pruebas reales a 1 frame por segundo.

Por lo mismo, el suavizado del contador va por **tiempo real** y no por número
de frames: con interpolación por frame, a 1 fps el número avanzaba un 1 % por
segundo y se quedaba clavado en 25 con todo ya cargado.

### Dos trampas de GSAP que ya están resueltas — no las reintroduzcas

1. **Usa `fromTo`, nunca `from`.** Con `from`, GSAP deduce el valor final
   leyendo el estilo actual, y `ScrollTrigger.refresh()` lo vuelve a leer
   cuando el elemento sigue en su estado inicial. Graba `opacity: 0` como
   destino y el texto anima de 0 a 0: no aparece nunca.
2. **split-type cachea el HTML original del elemento.** Si re-partes el texto
   después de traducirlo, restaura el idioma viejo encima del nuevo. Por eso
   i18n emite `beforelangchange` (revertir splits) antes de `langchange`
   (volver a partir).

## Cómo funciona el idioma

El español **no** está en un JSON: está escrito en el HTML, porque el sitio
tiene que ser legible sin JavaScript. Al arrancar, `i18n.js` toma una foto de
los textos del DOM y esa foto es la fuente de verdad del español. Solo el
inglés se pide por red, y solo la primera vez.

Para añadir texto traducible:

```html
<p data-i18n="mi.clave">Texto en español</p>
<nav data-i18n-attr="aria-label:mi.otraClave" aria-label="Etiqueta">
```

Y añade `mi.clave` a `i18n/en.json`. Si falta una clave en inglés, ese
elemento se queda en español en vez de romperse.

## Logos del stack

Los 10 logos oficiales vienen de [Simple Icons](https://simpleicons.org)
(licencia CC0) y están **inline** en `index.html`, no como archivos sueltos:
así se tiñen con `currentColor` y se puede pasar de monocromo a color de marca
sin trucos de filtros CSS.

Dos excepciones, marcadas a propósito con un glifo geométrico neutro en vez de
un logo:

- **WebSockets** es un protocolo, no tiene logo oficial.
- **Playwright** está excluido de Simple Icons por política de marca.

Es mejor un símbolo honesto que un logo inventado.

> **Nota sobre GSAP**: su logo oficial (la figura columpiándose) es 8,6 KB de
> los ~23 KB del bloque y se lee mal a 48px junto a logos geométricos. Si
> quieres, se sustituye por un texto o se quita de la lista.

## Pendientes de contenido

Busca y reemplaza estos tokens en `index.html`:

| Token | Qué es |
|---|---|
| `[URL_LUMINA]` | destino de las tarjetas de proyecto |
| `[PROYECTO DE CLIENTE 1]` | 4º proyecto (bórralo si no lo usas) |

Ya resueltos: GitHub, LinkedIn, Instagram, email, teléfono, WhatsApp y el CV
(`assets/doc/CV-Jose-Manuel-Sanchez-Marin.pdf`). El correo de Lumina Dev apunta
de momento al personal; cámbialo cuando tengas uno propio del estudio.

Las imágenes en `assets/img/projects/*.svg` son **placeholders**. Reemplázalas
por `.webp` reales de 1200×800 y actualiza el `src` y la extensión.

La foto del hero (`assets/img/jose.*`) va en WebP con respaldo JPEG y en dos
anchos (800 y 1199px). Se compone en tres capas, todas en `.hero__media`
(`06-sections.css`):

1. `filter` la lleva casi a blanco y negro y la oscurece, para que encaje en
   un sistema monocromo con un solo violeta.
2. `mask` es un foco radial sobre el sujeto: el resto se desvanece. Los
   tokens `--focus-x` / `--focus-y` mueven ese foco sin tocar nada más.
3. `::after` sella los bordes contra el negro y crea la zona legible del texto.

En pantalla ancha la imagen se ensancha al 112% y se corre un 20% a la
derecha: la foto es vertical, así que con `cover` a lo ancho no queda margen
horizontal que mover y el sujeto caería debajo del titular.

## Añadir un proyecto

Duplica un `<li class="project">` dentro de `.work__list`, sube el número de
`.project__index` y añade sus claves a `i18n/en.json`. El layout de 3 columnas
en desktop y el reveal al hover funcionan solos.

## Reglas del proyecto

- **Sin JS el sitio sigue siendo legible.** Nada de contenido inyectado por
  JavaScript. El `<noscript>` retira el preloader.
- **El acento `#9965CA` da 4.87:1.** Para texto pequeño usa siempre
  `--c-accent-bright`.
- **`prefers-reduced-motion` se controla desde un solo bloque** en
  `02-tokens.css`. JS lee esos mismos tokens, así que CSS y GSAP no se
  desincronizan.
# Portafolio
