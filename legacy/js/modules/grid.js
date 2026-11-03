/**
 * grid.js — la rejilla del fondo reacciona al cursor
 *
 * La versión de CSS (08-canvas.css) es un `background` de gradientes: no se
 * puede deformar línea a línea. Así que cuando hay ratón la sustituimos por
 * un canvas con la MISMA rejilla, pero dibujada como polilíneas que pasan
 * por una malla de puntos.
 *
 * Cada punto se aparta del cursor con una caída suave, y las líneas, al
 * pasar por esos puntos, se curvan. Cerca del cursor se dibuja una segunda
 * pasada más brillante recortada a un círculo: la rejilla se "enciende"
 * donde estás mirando.
 *
 * Coste: en una ventana de 1440x900 con paso de 88px son ~190 puntos. El
 * bucle solo corre mientras algo se mueve; en reposo el canvas se queda
 * quieto sin gastar frames.
 *
 * Sin ratón, en táctil o con `prefers-reduced-motion` no se crea nada y
 * queda la rejilla estática de CSS, que es exactamente igual.
 */

import { onTick, damp } from '../utils/raf.js';
import { allowsPointerFX, readToken, onEnvChange } from '../utils/env.js';

const RADIUS = 320;    // px de alcance del cursor
const STRENGTH = 46;   // px de desplazamiento máximo de un punto
const EASE = 0.12;     // suavizado del movimiento de cada punto
const POINTER_EASE = 0.2;
const SETTLED = 0.05;  // px por debajo de los cuales damos el punto por quieto

export function initGrid() {
  let canvas = null;
  let ctx = null;
  let stopTick = null;
  let resizeTimer = null;

  // Malla
  let cols = 0, rows = 0, spacing = 88;
  let baseX = null, baseY = null;   // posición en reposo
  let offX = null, offY = null;     // desplazamiento actual
  let width = 0, height = 0, dpr = 1;

  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false };

  /* --- Construcción -------------------------------------------------- */

  function readTokens() {
    spacing = readToken('--grid-size', 88);
    const styles = getComputedStyle(document.documentElement);
    return {
      line: styles.getPropertyValue('--c-line').trim() || '#292D30',
      bright: styles.getPropertyValue('--c-accent').trim() || '#9281F7',
      alpha: readToken('--grid-opacity', 0.5),
    };
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    readTokens();

    // Un punto extra a cada lado para que las líneas salgan de la pantalla
    cols = Math.ceil(width / spacing) + 2;
    rows = Math.ceil(height / spacing) + 2;

    const total = cols * rows;
    baseX = new Float32Array(total);
    baseY = new Float32Array(total);
    offX = new Float32Array(total);
    offY = new Float32Array(total);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        baseX[i] = (c - 1) * spacing;
        baseY[i] = (r - 1) * spacing;
      }
    }
  }

  /* --- Dibujo --------------------------------------------------------- */

  /* '#9281F7' -> 'rgba(146,129,247,a)' — hace falta para degradar el brillo
     del cursor hasta transparente. */
  function rgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  /* Construye la malla como Path2D UNA vez por frame. Antes se recorria dos
     veces (una por pasada de color) y el coste de trazado se duplicaba. */
  function buildPath() {
    const path = new Path2D();

    // Horizontales: una polilinea por fila
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = baseX[i] + offX[i];
        const y = baseY[i] + offY[i];
        if (c === 0) path.moveTo(x, y); else path.lineTo(x, y);
      }
    }

    // Verticales: una polilinea por columna
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const i = r * cols + c;
        const x = baseX[i] + offX[i];
        const y = baseY[i] + offY[i];
        if (r === 0) path.moveTo(x, y); else path.lineTo(x, y);
      }
    }

    return path;
  }

  function draw() {
    const { line, bright, alpha } = readTokens();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);

    // Una unica pasada de trazado
    ctx.strokeStyle = line;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    ctx.stroke(buildPath());
    ctx.globalAlpha = 1;

    /* El brillo del cursor NO es un segundo trazado de toda la malla: es un
       relleno radial con `source-atop`, que solo pinta donde ya hay tinta,
       o sea encima de las lineas. Un fill en vez de un stroke completo. */
    if (pointer.inside) {
      const r = RADIUS;
      const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, r);
      glow.addColorStop(0,    rgba(bright, 0.72));
      glow.addColorStop(0.35, rgba(bright, 0.3));
      glow.addColorStop(1,    rgba(bright, 0));

      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = glow;
      ctx.fillRect(pointer.x - r, pointer.y - r, r * 2, r * 2);
    }

    /* La mascara de desvanecido se hornea aqui con `destination-in` en vez de
       aplicarse como `mask-image` de CSS: un elemento fijo a pantalla completa
       con mascara CSS obliga al navegador a recomponer la capa en cada frame. */
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fadeMask();
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'source-over';
  }

  /* Mismo desvanecido que tenia la version CSS, cacheado entre frames */
  let cachedMask = null;
  let cachedMaskSize = '';
  function fadeMask() {
    const key = `${width}x${height}`;
    if (cachedMask && cachedMaskSize === key) return cachedMask;

    const g = ctx.createRadialGradient(
      width / 2, height * 0.12, 0,
      width / 2, height * 0.12, Math.max(width, height) * 1.15
    );
    g.addColorStop(0,    'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.6)');
    g.addColorStop(0.88, 'rgba(0,0,0,0)');

    cachedMask = g;
    cachedMaskSize = key;
    return g;
  }

  /* --- Física --------------------------------------------------------- */

  function update(delta) {
    pointer.x = damp(pointer.x, pointer.tx, POINTER_EASE, delta);
    pointer.y = damp(pointer.y, pointer.ty, POINTER_EASE, delta);

    let moving = false;
    const r2 = RADIUS * RADIUS;

    for (let i = 0; i < baseX.length; i++) {
      let targetX = 0;
      let targetY = 0;

      if (pointer.inside) {
        const dx = baseX[i] - pointer.x;
        const dy = baseY[i] - pointer.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < r2 && dist2 > 0.0001) {
          const dist = Math.sqrt(dist2);
          // Caída cuadrática: fuerte en el centro, nula en el borde
          const falloff = 1 - dist / RADIUS;
          const push = STRENGTH * falloff * falloff;
          targetX = (dx / dist) * push;
          targetY = (dy / dist) * push;
        }
      }

      offX[i] = damp(offX[i], targetX, EASE, delta);
      offY[i] = damp(offY[i], targetY, EASE, delta);

      if (!moving && (Math.abs(offX[i] - targetX) > SETTLED || Math.abs(offY[i] - targetY) > SETTLED)) {
        moving = true;
      }
    }

    draw();

    // Todo quieto y el cursor fuera: apagamos el bucle hasta el próximo movimiento
    if (!moving && !pointer.inside) stop();
  }

  function start() { if (!stopTick) stopTick = onTick(update); }
  function stop()  { if (stopTick) { stopTick(); stopTick = null; } }

  /* --- Eventos -------------------------------------------------------- */

  function onPointerMove(event) {
    pointer.tx = event.clientX;
    pointer.ty = event.clientY;

    // Primer movimiento: colocamos el puntero sin animar desde fuera
    if (!pointer.inside) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
      pointer.inside = true;
    }
    start();
  }

  function onPointerLeave() {
    pointer.inside = false;
    start(); // deja que la malla vuelva a su sitio suavemente
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      draw();
    }, 150);
  }

  /* --- Montaje / desmontaje ------------------------------------------- */

  function mount() {
    if (canvas) return;

    canvas = document.createElement('canvas');
    canvas.className = 'canvas-grid';
    canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d');
    document.body.prepend(canvas);

    // Apaga la rejilla de CSS: ahora manda el canvas
    document.documentElement.classList.add('has-canvas-grid');

    build();
    draw();

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);
  }

  function unmount() {
    if (!canvas) return;

    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
    stop();

    canvas.remove();
    canvas = null;
    ctx = null;
    document.documentElement.classList.remove('has-canvas-grid');
  }

  function sync() {
    if (allowsPointerFX()) mount(); else unmount();
  }

  sync();
  onEnvChange(sync);
}
