/**
 * projects.js — parallax de la imagen del proyecto
 *
 * El reveal en sí lo hace CSS (06-sections.css): si este archivo no carga,
 * pasar el ratón por encima sigue mostrando la imagen. Lo que añade JS es
 * el desplazamiento suave siguiendo al cursor.
 *
 * Se mueve la imagen DENTRO de su marco, no el marco: así el layout nunca
 * se descoloca y no hay reflow, solo transform.
 */

import { onTick, damp } from '../utils/raf.js';
import { allowsPointerFX, onEnvChange } from '../utils/env.js';

const EASE = 0.12;
const MAX_SHIFT = 18;   // px que se desplaza la imagen dentro del marco
const ZOOM = 1.08;      // margen de escala para que el desplazamiento no deje bordes

export function initProjects() {
  const projects = [...document.querySelectorAll('[data-project]')]
    .map((root) => ({
      root,
      img: root.querySelector('[data-project-media] img'),
    }))
    .filter((p) => p.img);

  if (!projects.length) return;

  let stopTick = null;
  const state = projects.map(() => ({ x: 0, y: 0, tx: 0, ty: 0, hovered: false }));

  function onEnter(index) {
    state[index].hovered = true;
    projects[index].img.style.scale = String(ZOOM);
    start();
  }

  function onLeave(index) {
    state[index].hovered = false;
    state[index].tx = 0;
    state[index].ty = 0;
    projects[index].img.style.scale = '';
  }

  function onMove(index, event) {
    const rect = projects[index].root.getBoundingClientRect();
    // -1 .. 1 respecto al centro de la fila
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    state[index].tx = nx * MAX_SHIFT;
    state[index].ty = ny * MAX_SHIFT;
  }

  function update(delta) {
    let moving = false;

    state.forEach((s, i) => {
      s.x = damp(s.x, s.tx, EASE, delta);
      s.y = damp(s.y, s.ty, EASE, delta);

      const settled = Math.abs(s.x) < 0.1 && Math.abs(s.y) < 0.1 && !s.hovered;

      if (settled) {
        s.x = 0; s.y = 0;
        projects[i].img.style.translate = '';
      } else {
        projects[i].img.style.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
        moving = true;
      }
    });

    if (!moving) stop();
  }

  function start() {
    if (!stopTick) stopTick = onTick(update);
  }

  function stop() {
    if (stopTick) { stopTick(); stopTick = null; }
  }

  const listeners = [];

  function enable() {
    projects.forEach((p, i) => {
      const enter = () => onEnter(i);
      const leave = () => onLeave(i);
      const move = (e) => onMove(i, e);

      p.root.addEventListener('pointerenter', enter);
      p.root.addEventListener('pointerleave', leave);
      p.root.addEventListener('pointermove', move, { passive: true });

      listeners.push(() => {
        p.root.removeEventListener('pointerenter', enter);
        p.root.removeEventListener('pointerleave', leave);
        p.root.removeEventListener('pointermove', move);
      });
    });
  }

  function disable() {
    listeners.splice(0).forEach((off) => off());
    stop();
    projects.forEach((p) => {
      p.img.style.translate = '';
      p.img.style.scale = '';
    });
  }

  function sync() {
    disable();
    // El parallax solo existe en desktop con ratón. En táctil la imagen
    // ya se ve siempre (regla de CSS), que es lo correcto ahí.
    if (allowsPointerFX() && window.innerWidth >= 1024) enable();
  }

  sync();
  onEnvChange(sync);
  window.addEventListener('resize', sync);
}
