/**
 * raf.js — un único requestAnimationFrame para todo el sitio
 *
 * El magnetismo, el parallax de las imágenes y (en la Fase 7) el cursor
 * y Lenis se suscriben aquí en vez de abrir cada uno su propio bucle.
 * Un solo frame, un solo punto donde parar todo.
 *
 * El bucle se detiene solo cuando no queda nadie suscrito.
 */

const subscribers = new Set();
let frameId = null;
let last = 0;

function tick(now) {
  const delta = last ? Math.min((now - last) / 16.667, 4) : 1; // en "frames de 60fps"
  last = now;

  subscribers.forEach((fn) => fn(delta, now));

  frameId = subscribers.size ? requestAnimationFrame(tick) : null;
  if (!frameId) last = 0;
}

/** Suscribe una función al bucle. Devuelve la función para desuscribirla. */
export function onTick(fn) {
  subscribers.add(fn);

  if (frameId === null) frameId = requestAnimationFrame(tick);

  return () => {
    subscribers.delete(fn);
  };
}

/** Interpolación lineal: acerca `current` a `target` un `factor` por frame. */
export const lerp = (current, target, factor) => current + (target - current) * factor;

/**
 * Interpolación estable a distintos framerates.
 * En un monitor de 120Hz el lerp normal llega el doble de rápido; esto lo corrige.
 */
export const damp = (current, target, factor, delta) =>
  current + (target - current) * (1 - Math.pow(1 - factor, delta));
