/**
 * magnetic.js — botones magnéticos
 *
 * El botón se inclina hacia el puntero cuando entra en su radio de
 * atracción, antes incluso de que el cursor lo toque.
 *
 * La física sale de los tokens CSS (--magnet-radius, --magnet-pull), así que
 * `prefers-reduced-motion` la anula desde 02-tokens.css sin tocar este archivo.
 *
 * Vanilla a propósito: GSAP no entra hasta la Fase 5, y este mismo bucle
 * compartido lo reutiliza el cursor personalizado en la Fase 7.
 */

import { onTick, damp } from '../utils/raf.js';
import { allowsPointerFX, readToken, onEnvChange } from '../utils/env.js';

const EASE = 0.18;
const SNAP = 0.1; // px: por debajo de esto damos el movimiento por terminado

export function initMagnetic() {
  const elements = [...document.querySelectorAll('[data-magnetic]')];
  if (!elements.length) return;

  let stopTick = null;
  let pointer = { x: 0, y: 0, active: false };

  // Estado por elemento: dónde está y hacia dónde va
  const items = elements.map((el) => ({
    el,
    x: 0, y: 0,
    targetX: 0, targetY: 0,
  }));

  function onPointerMove(event) {
    pointer = { x: event.clientX, y: event.clientY, active: true };
  }

  function onPointerLeave() {
    pointer.active = false;
  }

  function update(delta) {
    const radius = readToken('--magnet-radius', 90);
    const pull = readToken('--magnet-pull', 0.34);

    let moving = false;

    for (const item of items) {
      const rect = item.el.getBoundingClientRect();

      // Descarta lo que no está en pantalla: no calculamos física invisible
      const onScreen = rect.bottom > 0 && rect.top < window.innerHeight;

      if (!pointer.active || !onScreen || radius === 0) {
        item.targetX = 0;
        item.targetY = 0;
      } else {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = pointer.x - cx;
        const dy = pointer.y - cy;

        // El radio se mide desde el borde del botón, no desde su centro:
        // así un botón ancho no atrae desde mucho más lejos que uno estrecho.
        const reachX = rect.width / 2 + radius;
        const reachY = rect.height / 2 + radius;
        const within = Math.abs(dx) < reachX && Math.abs(dy) < reachY;

        item.targetX = within ? dx * pull : 0;
        item.targetY = within ? dy * pull : 0;
      }

      item.x = damp(item.x, item.targetX, EASE, delta);
      item.y = damp(item.y, item.targetY, EASE, delta);

      if (Math.abs(item.x) < SNAP && Math.abs(item.y) < SNAP && item.targetX === 0 && item.targetY === 0) {
        item.x = 0;
        item.y = 0;
        item.el.style.transform = '';
      } else {
        item.el.style.transform = `translate3d(${item.x.toFixed(2)}px, ${item.y.toFixed(2)}px, 0)`;
        moving = true;
      }
    }

    // Nadie se mueve y el puntero está fuera: apagamos el bucle
    if (!moving && !pointer.active) stop();
  }

  function start() {
    if (stopTick) return;
    stopTick = onTick(update);
  }

  function stop() {
    if (!stopTick) return;
    stopTick();
    stopTick = null;
  }

  function enable() {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('pointermove', start, { passive: true });
  }

  function disable() {
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('pointermove', start);
    stop();
    items.forEach((item) => {
      item.x = 0; item.y = 0;
      item.el.style.transform = '';
    });
  }

  function sync() {
    disable();
    if (allowsPointerFX()) enable();
  }

  sync();
  // Si el usuario activa "reducir movimiento" o conecta un ratón, reaccionamos
  onEnvChange(sync);
}
