/**
 * motion.js — interruptor de movimiento del footer
 *
 * Por qué existe: si tu sistema tiene "reducir movimiento" activado, el sitio
 * te lo respeta y no ves ni una animación. Correcto por defecto, pero deja al
 * visitante sin forma de cambiar de opinión.
 *
 * El interruptor NO desactiva la accesibilidad: el estado inicial sigue
 * siendo el que pide el sistema operativo. Solo permite decidir otra cosa, y
 * esa decisión se recuerda en este navegador.
 *
 * Sin JS el botón no existe, y sin él manda el sistema. Que es justo lo
 * correcto cuando no hay nadie para pulsar nada.
 */

import { motionPreference, motionEnabled, setMotionPreference, onEnvChange } from '../utils/env.js';

export function initMotionToggle() {
  const button = document.querySelector('[data-motion-toggle]');
  if (!button) return;

  const state = button.querySelector('[data-motion-state]');

  function render() {
    const on = motionEnabled();

    button.setAttribute('aria-pressed', String(on));
    button.dataset.motionOn = String(on);

    if (state) {
      // Los textos viven en el HTML y en en.json, no aquí
      state.textContent = on
        ? button.dataset.labelOn || 'Activado'
        : button.dataset.labelOff || 'Desactivado';
    }
  }

  button.addEventListener('click', () => {
    /* Se guarda siempre un valor explícito, nunca se vuelve a "seguir al
       sistema": si alguien pulsa el interruptor es porque quiere decidir. */
    setMotionPreference(motionEnabled() ? 'off' : 'on');
  });

  // Repinta si cambia por el botón o porque el sistema cambió de idea
  onEnvChange(render);
  render();

  // El botón solo tiene sentido con JS: hasta aquí estaba oculto
  button.hidden = false;

  return { hasPreference: () => motionPreference() !== null };
}
