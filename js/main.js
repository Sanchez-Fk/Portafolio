/**
 * main.js — orquestador
 *
 * Regla del proyecto: nada aquí puede ser necesario para leer el sitio.
 * Si este archivo no carga, la página sigue siendo un documento completo.
 *
 * Fase 3: i18n.
 * Fase 4: micro-interacciones de puntero.
 * Fases 5-7: GSAP, preloader, cursor y Lenis.
 */

import { initI18n } from './modules/i18n.js';
import { initGrid } from './modules/grid.js';
import { initMagnetic } from './modules/magnetic.js';
import { initProjects } from './modules/projects.js';
import { initHorizontal } from './modules/horizontal.js';
import { initReveals } from './modules/reveals.js';
import { initPreloader } from './modules/preloader.js';

async function boot() {
  // Marca que JS está vivo: permite estilos que solo aplican con JS
  document.documentElement.classList.add('js');

  initI18n();
  initGrid();
  initMagnetic();
  initProjects();

  // El carrusel va ANTES que los reveals: cambia el alto de la página
  // al fijar la sección, y ScrollTrigger necesita medir sobre el layout final.
  initHorizontal();

  /* Los reveals esperan al preloader a propósito. Si se construyeran antes,
     el hero se animaría DETRÁS del panel y para cuando este se retirase la
     entrada ya habría terminado: el usuario no vería nada.
     La promesa resuelve a mitad de la salida, así ambas cosas se solapan. */
  await initPreloader();

  initReveals();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
