/**
 * env.js — detección de entorno y preferencia de movimiento
 *
 * Todo el motion del sitio pregunta aquí antes de arrancar. Las consultas son
 * reactivas: si el usuario cambia "reducir movimiento" en su sistema, conecta
 * un ratón a una tablet o pulsa el interruptor del footer, los módulos se
 * enteran sin recargar la página.
 *
 * Hay tres estados de movimiento:
 *
 *   null   sigue al sistema operativo   ← por defecto
 *   'on'   el visitante lo activó a mano
 *   'off'  el visitante lo apagó a mano
 *
 * El sistema operativo manda salvo que el visitante diga otra cosa
 * explícitamente. Su decisión pesa más que la del sistema porque es más
 * reciente y más específica: la tomó en ESTE sitio.
 */

const STORAGE_KEY = 'jms-motion';
const EVENT = 'motionpreferencechange';

const mqHover   = window.matchMedia('(hover: hover) and (pointer: fine)');
const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Puntero fino con hover real: ratón o trackpad, no dedo. */
export const canHover = () => mqHover.matches;

/* --- Preferencia manual --------------------------------------------------- */

let manual = null;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'on' || saved === 'off') manual = saved;
} catch { /* modo privado */ }

// `?motion=force` sigue existiendo para desarrollo: gana sin guardar nada
if (new URLSearchParams(location.search).get('motion') === 'force') manual = 'on';

/**
 * Marca <html> para que el CSS aplique lo mismo que el JS.
 * `.motion-forced` anula el bloque de `prefers-reduced-motion`.
 * `.motion-off` lo aplica aunque el sistema no lo pida.
 */
function applyClasses() {
  const root = document.documentElement;
  root.classList.toggle('motion-forced', manual === 'on');
  root.classList.toggle('motion-off', manual === 'off');
}
applyClasses();

/** `null` = seguir al sistema. */
export const motionPreference = () => manual;

/** ¿Se está moviendo el sitio ahora mismo? */
export const motionEnabled = () => !prefersReducedMotion();

/** Cambia la preferencia y avisa a todos los módulos. */
export function setMotionPreference(value) {
  manual = (value === 'on' || value === 'off') ? value : null;

  try {
    if (manual) localStorage.setItem(STORAGE_KEY, manual);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* modo privado: vale igual para esta sesión */ }

  applyClasses();
  document.dispatchEvent(new CustomEvent(EVENT, { detail: { motion: manual } }));
}

/* --- Consultas ------------------------------------------------------------ */

/** Hay que reducir el movimiento: lo pidió el visitante o lo pide su sistema. */
export function prefersReducedMotion() {
  if (manual === 'on') return false;
  if (manual === 'off') return true;
  return mqReduced.matches;
}

/**
 * ¿Puede este dispositivo permitirse efectos de puntero?
 * Es la única pregunta que hacen los módulos de interacción.
 */
export const allowsPointerFX = () => canHover() && !prefersReducedMotion();

/** Avisa cuando cambia el entorno o la preferencia manual. */
export function onEnvChange(callback) {
  mqHover.addEventListener('change', callback);
  mqReduced.addEventListener('change', callback);
  document.addEventListener(EVENT, callback);
}

/**
 * Lee un token numérico del CSS. Así la física de JS vive en
 * 02-tokens.css junto al resto del sistema, y la preferencia de movimiento
 * la anula desde un único sitio.
 */
export function readToken(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}
