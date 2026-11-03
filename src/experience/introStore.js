/**
 * introStore.js — cuándo se reproduce la intro
 *
 * Vive fuera de React: el script en línea de index.html, la intro, el rostro
 * del hero y los botones del pie consultan lo mismo.
 *
 *   idle      aún no se decide (prerender y primer render)
 *   playing   la intro está en pantalla
 *   done      el sitio está a la vista
 *
 * La intro se reproduce sola solo en la primera visita de la sesión, sin enlace
 * directo (#seccion), con movimiento activo y si el visitante no la apagó.
 * Las mismas reglas están copiadas en el script de index.html, que tapa la
 * página antes de pintar para que el hero no asome un instante.
 */

import { motionEnabled } from '../lib/env.js';

const SEEN_KEY = 'jms-intro-seen';   // sessionStorage
const OFF_KEY = 'jms-intro';         // localStorage: 'off'
const EVENT = 'introchange';

let state = 'idle';
let replay = false;

const isBrowser = typeof window !== 'undefined';

function read(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

/** ¿El visitante apagó la intro con "No mostrar más"? */
export const introDisabled = () => isBrowser && read(localStorage, OFF_KEY) === 'off';

export function setIntroDisabled(off) {
  try {
    if (off) localStorage.setItem(OFF_KEY, 'off');
    else localStorage.removeItem(OFF_KEY);
  } catch { /* modo privado */ }
  emit();
}

/** Decide al arrancar si la intro corre sola. */
export function shouldAutoplay() {
  if (!isBrowser) return false;
  if (location.hash && location.hash !== '#hero') return false;
  if (read(sessionStorage, SEEN_KEY)) return false;
  if (introDisabled()) return false;
  return motionEnabled();
}

export const introState = () => state;

/** `true` si la intro actual la pidió el visitante desde el pie. */
export const introIsReplay = () => replay;

function set(next) {
  state = next;
  emit();
}

function emit() {
  if (isBrowser) document.dispatchEvent(new CustomEvent(EVENT));
}

export function startIntro(isReplay = false) {
  replay = isReplay;
  set('playing');
}

export function finishIntro() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* modo privado */ }
  replay = false;
  set('done');
}

export function onIntroChange(callback) {
  document.addEventListener(EVENT, callback);
  return () => document.removeEventListener(EVENT, callback);
}
