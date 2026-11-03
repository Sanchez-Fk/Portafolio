/**
 * stars.js — dibujo compartido de las estrellas del rostro
 *
 * El hero y la intro pintan el rostro con estas mismas funciones y el mismo
 * reloj (`performance.now()`). Por eso, cuando la intro termina y cede el sitio
 * al lienzo del hero, el cambio no se nota.
 */

/* Los datos del rostro (~48 KB) llegan en un chunk aparte: no frenan el primer render */
let loading = null;
let source = null;

/** Descarga los datos una vez. Hero e intro esperan esta promesa antes de pintar. */
export function loadFaceStars() {
  loading ??= import('./faceStars.js').then((m) => {
    source = m.FACE_STARS;
    return faceStars();
  });
  return loading;
}

/* Blanco, lavanda y azul de atmósfera: los tres tonos de luz del sistema */
const TINTS = [
  ['255,255,255', '208,184,255'],
  ['232,220,255', '181,140,255'],
  ['214,226,255', '110,155,255'],
];

/** Calidad según el equipo: menos estrellas y menos resolución en móvil. */
export function starBudget() {
  const small = window.matchMedia('(max-width: 767px)').matches;
  return {
    count: small ? 5200 : 9000,
    field: small ? 700 : 1600,
    dpr: Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2),
  };
}

let decoded = null;

/**
 * Posiciones normalizadas del rostro (0..1 sobre su caja), brillo, tono y
 * ritmo de titileo. Se decodifica una vez y lo comparten hero e intro.
 * Devuelve `null` hasta que `loadFaceStars()` termina.
 */
export function faceStars() {
  if (decoded) return decoded;
  if (!source) return null;
  const bin = atob(source);
  const n = Math.floor(bin.length / 5);
  const u = new Float32Array(n);
  const v = new Float32Array(n);
  const bright = new Float32Array(n);
  const tint = new Uint8Array(n);
  const phase = new Float32Array(n);
  const speed = new Float32Array(n);
  const byte = (i) => bin.charCodeAt(i);
  for (let i = 0; i < n; i++) {
    const o = i * 5;
    u[i] = (byte(o) | (byte(o + 1) << 8)) / 65535;
    v[i] = (byte(o + 2) | (byte(o + 3) << 8)) / 65535;
    bright[i] = byte(o + 4) / 255;
    // Pseudoaleatorio estable por índice: el titileo es igual en cada visita
    const h = Math.sin(i * 12.9898) * 43758.5453;
    const r = h - Math.floor(h);
    tint[i] = r < 0.62 ? 0 : r < 0.86 ? 1 : 2;
    phase[i] = r * Math.PI * 2;
    speed[i] = 0.6 + ((r * 7.31) % 1) * 1.6;
  }
  decoded = { n, u, v, bright, tint, phase, speed };
  return decoded;
}

/** Halo de una estrella prerenderizado: dibujar imágenes es lo barato en Canvas 2D. */
function makeSprite(core, halo) {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${core},1)`);
  grad.addColorStop(0.14, `rgba(${core},0.95)`);
  grad.addColorStop(0.3, `rgba(${halo},0.32)`);
  grad.addColorStop(0.62, `rgba(${halo},0.06)`);
  grad.addColorStop(1, `rgba(${halo},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

let sprites = null;
export function starSprites() {
  if (!sprites) sprites = TINTS.map(([core, halo]) => makeSprite(core, halo));
  return sprites;
}

/** Titileo suave: nunca apaga una estrella del todo, para que el rostro no parpadee. */
export const twinkle = (stars, i, seconds) =>
  0.8 + 0.2 * Math.sin(seconds * stars.speed[i] + stars.phase[i]);

/** Tamaño del halo para una estrella de brillo `b` en un rostro de `height` px. */
export const starSize = (b, height) => (height / 900) * (3.5 + b * 10.5);

/** Opacidad base: las estrellas tenues quedan de fondo y los rasgos brillan. */
export const starAlpha = (b) => 0.16 + 0.84 * Math.pow(b, 1.4);

/**
 * Pinta el rostro completo en la caja (x, y, w, h), en píxeles del lienzo.
 * `count` limita las estrellas; el orden ya viene barajado.
 */
export function drawFace(ctx, stars, count, x, y, w, h, seconds, alpha = 1) {
  const sp = starSprites();
  const n = Math.min(count, stars.n);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const b = stars.bright[i];
    const s = starSize(b, h);
    ctx.globalAlpha = alpha * starAlpha(b) * twinkle(stars, i, seconds);
    ctx.drawImage(sp[stars.tint[i]], x + stars.u[i] * w - s / 2, y + stars.v[i] * h - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
