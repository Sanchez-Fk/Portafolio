/**
 * face-stars.mjs — convierte la selfie frontal en las estrellas del rostro
 *
 *   node scripts/face-stars.mjs ruta/a/selfie.jpg
 *
 * Escribe src/scene/faceStars.js. La foto no se publica: solo las posiciones.
 * Necesita ffmpeg para leer la imagen.
 *
 * Cada estrella nace de dos señales: la luz de la piel y los bordes (ojos, cejas,
 * labios, línea del pelo). El fondo claro se descarta por inundación desde los
 * bordes de la imagen, porque la pared es blanca y casi sin color.
 *
 * La cámara frontal agranda la nariz. Antes de muestrear se encoge con una
 * deformación local suave para acercarla a la real, sin exagerar.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Uso: node scripts/face-stars.mjs selfie.jpg');

/* Recorte de la cabeza en la selfie de 972x1296, a mitad de resolución */
const CROP = { x: 250, y: 180, w: 440, h: 690 };
const W = 220;
const H = 345;

/* Nariz, en coordenadas de la rejilla W x H */
const NOSE = { x: 110, y: 212, rx: 34, ry: 40, shrink: 0.15 };

const COUNT = 9000;
const SEED = 20261030;

const raw = execFileSync('ffmpeg', [
  '-v', 'error', '-i', source,
  '-vf', `crop=${CROP.w}:${CROP.h}:${CROP.x}:${CROP.y},scale=${W}:${H}:flags=area`,
  '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
], { maxBuffer: 1 << 26 });

const at = (x, y) => y * W + x;
const lum = new Float32Array(W * H);
const chroma = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = raw[i * 3], g = raw[i * 3 + 1], b = raw[i * 3 + 2];
  lum[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  chroma[i] = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

/* --- Fondo: inundación desde el borde sobre píxeles claros y sin color ------ */
const isWall = (i) => lum[i] > 0.55 && chroma[i] < 0.1;
const background = new Uint8Array(W * H);
const queue = [];
for (let x = 0; x < W; x++) queue.push(at(x, 0), at(x, H - 1));
for (let y = 0; y < H; y++) queue.push(at(0, y), at(W - 1, y));
while (queue.length) {
  const i = queue.pop();
  if (background[i] || !isWall(i)) continue;
  background[i] = 1;
  const x = i % W, y = (i / W) | 0;
  if (x > 0) queue.push(i - 1);
  if (x < W - 1) queue.push(i + 1);
  if (y > 0) queue.push(i - W);
  if (y < H - 1) queue.push(i + W);
}

/* Silueta suavizada: evita un contorno dentado de estrellas */
const fg = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let sum = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        sum += background[at(xx, yy)] ? 0 : 1;
        n++;
      }
    }
    fg[at(x, y)] = sum / n;
  }
}

/* --- Piel suavizada ---------------------------------------------------------
   Dos pasadas de un desenfoque 3x3 borran poros y granos: sin esto, la textura
   de la piel se convierte en ruido de estrellas y la cara se ve áspera. */
function soften(field) {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const w = (dx ? 1 : 2) * (dy ? 1 : 2);
          sum += field[at(xx, yy)] * w;
          n += w;
        }
      }
      out[at(x, y)] = sum / n;
    }
  }
  return out;
}
const soft = soften(soften(lum));
/* El tono usa una piel aún más lisa: granos y poros no deben abrir huecos */
const smoothSkin = [0, 1, 2, 3, 4].reduce((f) => soften(f), soft);

/* --- Bordes (Sobel sobre la piel suavizada) --------------------------------- */
const edge = new Float32Array(W * H);
let edgeMax = 0;
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const l = (dx, dy) => soft[at(x + dx, y + dy)];
    const gx = -l(-1, -1) - 2 * l(-1, 0) - l(-1, 1) + l(1, -1) + 2 * l(1, 0) + l(1, 1);
    const gy = -l(-1, -1) - 2 * l(0, -1) - l(1, -1) + l(-1, 1) + 2 * l(0, 1) + l(1, 1);
    const m = Math.hypot(gx, gy);
    edge[at(x, y)] = m;
    if (m > edgeMax) edgeMax = m;
  }
}
for (let i = 0; i < W * H; i++) edge[i] = Math.min(1, edge[i] / (edgeMax * 0.4));

/* --- Muestreo bilineal con la nariz encogida -------------------------------- */
function sample(field, x, y) {
  const dx = (x - NOSE.x) / NOSE.rx;
  const dy = (y - NOSE.y) / NOSE.ry;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1) {
    // Agrandar la coordenada de origen encoge lo que se dibuja
    const k = 1 + NOSE.shrink * (1 - d2) * (1 - d2);
    x = NOSE.x + (x - NOSE.x) * k;
    y = NOSE.y + (y - NOSE.y) * k;
  }
  x = Math.min(W - 1.001, Math.max(0, x));
  y = Math.min(H - 1.001, Math.max(0, y));
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  const a = field[at(x0, y0)], b = field[at(x0 + 1, y0)];
  const c = field[at(x0, y0 + 1)], d = field[at(x0 + 1, y0 + 1)];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* --- Tono: la piel ocupa todo el rango y el relieve local se acentúa ------- */
function boxBlur(field, r) {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sum = 0, n = 0;
      for (let dy = -r; dy <= r; dy += 2) {
        for (let dx = -r; dx <= r; dx += 2) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H || background[at(xx, yy)]) continue;
          sum += field[at(xx, yy)];
          n++;
        }
      }
      out[at(x, y)] = n ? sum / n : field[at(x, y)];
    }
  }
  return out;
}

const skinValues = [];
for (let i = 0; i < W * H; i++) if (!background[i] && lum[i] > 0.3) skinValues.push(lum[i]);
skinValues.sort((a, b) => a - b);
const LO = skinValues[Math.floor(skinValues.length * 0.04)];
const HI = skinValues[Math.floor(skinValues.length * 0.97)];

/* La luz de la selfie entra de un lado. Se compensa con la iluminación a gran
   escala para que las dos mitades de la cara pesen parecido. */
const light = boxBlur(smoothSkin, 34);
let lightMean = 0, lightN = 0;
for (let i = 0; i < W * H; i++) if (!background[i] && lum[i] > 0.3) { lightMean += light[i]; lightN++; }
lightMean /= lightN;
const even = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) even[i] = smoothSkin[i] * (0.45 + 0.55 * lightMean / Math.max(0.2, light[i]));

const blurred = boxBlur(even, 8);
const tone = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const local = (even[i] - blurred[i]) * 0.8;
  tone[i] = Math.min(1, Math.max(0, (even[i] - LO) / (HI - LO) + local));
}

/* El brillo sale de un tono todavía más suave: las manchas de la piel no apagan estrellas */
const toneSoft = boxBlur(tone, 4);

/* Densidad y brillo de una estrella en (x, y) */
function star(x, y) {
  const mask = sample(fg, x, y);
  if (mask < 0.05) return null;
  const L = sample(lum, x, y);
  const T = sample(tone, x, y);
  const E = sample(edge, x, y);
  const glow = Math.pow(sample(toneSoft, x, y), 1.2);
  const hair = 1 - smooth(0.16, 0.34, L);
  // La piel iluminada se llena; ojos, cejas y labios quedan como huecos
  const skin = Math.pow(T, 1.35) * (1 - hair);
  // Los bordes dentro de la cara dibujan párpados, aletas de la nariz y labios
  const line = Math.pow(E, 1.5) * (1 - hair) * 0.35;
  // El pelo es un velo tenue; sus bordes dibujan la silueta
  const veil = hair * (0.1 + E * 0.4);
  // El cuello se apaga hacia abajo
  const fade = 1 - smooth(H * 0.7, H * 0.88, y);
  const density = mask * fade * Math.min(1, skin + line + veil);
  const bright = Math.min(1, 0.34 + glow * (1 - hair) * 0.6 + line * 0.5 + hair * E * 0.3);
  return { density, bright };
}

/* --- Punteado de Poisson con radio variable ----------------------------------
   Cada estrella reserva a su alrededor un radio que crece donde la densidad
   baja. El reparto queda uniforme, sin grumos, y los rasgos salen limpios:
   es la técnica de los retratos en puntos. */
let s = SEED >>> 0;
const rand = () => {
  s = (s + 0x6D2B79F5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SPACING = Number(process.env.SPACING ?? 1.12);  // radio mínimo, en celdas de la rejilla
const MIN_DENSITY = 0.035;
const DARTS = 900000;

const GRID = SPACING;
const GW = Math.ceil(W / GRID), GH = Math.ceil(H / GRID);
const buckets = Array.from({ length: GW * GH }, () => []);
const stars = [];
const maxReach = Math.ceil(SPACING / Math.sqrt(MIN_DENSITY) / GRID);

for (let k = 0; k < DARTS; k++) {
  const x = rand() * W;
  const y = rand() * H;
  const st = star(x, y);
  if (!st || st.density < MIN_DENSITY) continue;
  const r = SPACING / Math.sqrt(st.density);
  const cx = (x / GRID) | 0, cy = (y / GRID) | 0;
  const reach = Math.min(maxReach, Math.ceil(r / GRID));
  let free = true;
  for (let gy = Math.max(0, cy - reach); free && gy <= Math.min(GH - 1, cy + reach); gy++) {
    for (let gx = Math.max(0, cx - reach); gx <= Math.min(GW - 1, cx + reach); gx++) {
      for (const j of buckets[gy * GW + gx]) {
        const o = stars[j];
        // Vale el radio menor de los dos: los rasgos densos no los aparta el entorno
        const need = Math.min(r, o[3]);
        if ((o[0] - x) ** 2 + (o[1] - y) ** 2 < need * need) { free = false; break; }
      }
      if (!free) break;
    }
  }
  if (!free) continue;
  buckets[cy * GW + cx].push(stars.length);
  stars.push([x, y, st.bright, r]);
}

/* Barajar: el móvil toma solo las primeras y el reparto sigue siendo uniforme */
for (let i = stars.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [stars[i], stars[j]] = [stars[j], stars[i]];
}
const kept = stars.slice(0, COUNT);

/* --- Relajación de Lloyd ponderada ---------------------------------------------
   El dardo deja huecos pequeños entre estrellas. Cada estrella se mueve al
   centro de masa (ponderado por la densidad) de la zona que le queda más
   cerca. Unas pocas pasadas bastan para un reparto parejo. */
const SUB = 2;                                   // muestras por celda y eje
const field = [];
for (let y = 0.5 / SUB; y < H; y += 1 / SUB) {
  for (let x = 0.5 / SUB; x < W; x += 1 / SUB) {
    const st = star(x, y);
    if (st && st.density >= MIN_DENSITY * 0.5) field.push(x, y, st.density);
  }
}

const RELAX = 6;
const BIN = 3;
const BW = Math.ceil(W / BIN), BH = Math.ceil(H / BIN);
for (let pass = 0; pass < RELAX; pass++) {
  const bins = Array.from({ length: BW * BH }, () => []);
  kept.forEach((st, i) => bins[Math.min(BH - 1, (st[1] / BIN) | 0) * BW + Math.min(BW - 1, (st[0] / BIN) | 0)].push(i));
  const sx = new Float64Array(kept.length), sy = new Float64Array(kept.length), sw = new Float64Array(kept.length);
  for (let k = 0; k < field.length; k += 3) {
    const x = field[k], y = field[k + 1], w = field[k + 2];
    const bx = (x / BIN) | 0, by = (y / BIN) | 0;
    let best = -1, bestD = Infinity;
    for (let ring = 1; ring <= 4 && best < 0; ring++) {
      for (let gy = Math.max(0, by - ring); gy <= Math.min(BH - 1, by + ring); gy++) {
        for (let gx = Math.max(0, bx - ring); gx <= Math.min(BW - 1, bx + ring); gx++) {
          for (const i of bins[gy * BW + gx]) {
            const d = (kept[i][0] - x) ** 2 + (kept[i][1] - y) ** 2;
            if (d < bestD) { bestD = d; best = i; }
          }
        }
      }
    }
    // Una muestra lejos de toda estrella no arrastra a nadie
    if (best < 0 || bestD > 16) continue;
    sx[best] += x * w; sy[best] += y * w; sw[best] += w;
  }
  kept.forEach((st, i) => {
    if (!sw[i]) return;
    st[0] = sx[i] / sw[i];
    st[1] = sy[i] / sw[i];
  });
}

/* El brillo se vuelve a leer en la posición final */
kept.forEach((st) => {
  const v = star(st[0], st[1]);
  if (v) st[2] = v.bright;
});

/* x, y en 0..65535 sobre el alto de la cara; brillo en 0..255 */
const bytes = Buffer.alloc(kept.length * 5);
kept.forEach(([x, y, b], i) => {
  bytes.writeUInt16LE(Math.round((x / W) * 65535), i * 5);
  bytes.writeUInt16LE(Math.round((y / H) * 65535), i * 5 + 2);
  bytes.writeUInt8(Math.round(b * 255), i * 5 + 4);
});

const out = resolve('src/scene/faceStars.js');
writeFileSync(out, `/* Generado por scripts/face-stars.mjs. No editar a mano. */
/* ${kept.length} estrellas: x, y (uint16 LE) y brillo (uint8), en base64 */
export const FACE_ASPECT = ${(W / H).toFixed(4)};
export const FACE_STARS = '${bytes.toString('base64')}';
`);

console.log(`${kept.length} de ${stars.length} estrellas → ${out}`);
