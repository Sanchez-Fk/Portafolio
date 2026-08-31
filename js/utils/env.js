/**
 * env.js — detección de entorno
 *
 * Todo el motion del sitio pregunta aquí antes de arrancar. Las consultas
 * son reactivas: si el usuario activa "reducir movimiento" o conecta un
 * ratón a una tablet, los módulos se enteran sin recargar la página.
 */

const mqHover   = window.matchMedia('(hover: hover) and (pointer: fine)');
const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Puntero fino con hover real: ratón o trackpad, no dedo. */
export const canHover = () => mqHover.matches;

/**
 * Override solo para desarrollo: `?motion=force` en la URL permite revisar
 * las animaciones en una maquina con "reducir movimiento" activado.
 * Marca <html> para que 02-tokens.css tambien lo respete.
 */
const forcedMotion = new URLSearchParams(location.search).get('motion') === 'force';
if (forcedMotion) document.documentElement.classList.add('motion-forced');

/** El usuario pidió menos movimiento a nivel de sistema operativo. */
export const prefersReducedMotion = () => !forcedMotion && mqReduced.matches;

/**
 * ¿Puede este dispositivo permitirse efectos de puntero?
 * Es la única pregunta que hacen los módulos de interacción.
 */
export const allowsPointerFX = () => canHover() && !prefersReducedMotion();

/** Avisa cuando cambia cualquiera de las dos condiciones. */
export function onEnvChange(callback) {
  mqHover.addEventListener('change', callback);
  mqReduced.addEventListener('change', callback);
}

/**
 * Lee un token numérico del CSS. Así la física de JS vive en
 * 02-tokens.css junto al resto del sistema, y `prefers-reduced-motion`
 * la anula desde un único sitio.
 */
export function readToken(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}
