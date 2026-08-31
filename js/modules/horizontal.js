/**
 * horizontal.js — carrusel horizontal de proyectos
 *
 * En desktop la sección de proyectos se fija en pantalla y el scroll
 * vertical se traduce en movimiento lateral de las tarjetas.
 *
 * Solo existe a partir de 1024px y con puntero/movimiento permitidos.
 * En móvil y con `prefers-reduced-motion` la lista se queda en vertical:
 * secuestrar el scroll en táctil es una mala idea, no una decoración.
 */

import { prefersReducedMotion } from '../utils/env.js';

export function initHorizontal() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const section = document.querySelector('.work');
  const viewport = document.querySelector('.work__viewport');
  const track = document.querySelector('.work__list');
  if (!section || !viewport || !track) return;

  const mm = window.gsap.matchMedia();

  mm.add('(min-width: 1024px)', () => {
    if (prefersReducedMotion()) return;

    // Cuánto tiene que viajar el track para que se vea la última tarjeta
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

    section.classList.add('is-horizontal');

    const tween = window.gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        // El recorrido vertical equivale al horizontal: 1px de scroll = 1px lateral
        end: () => '+=' + distance(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        // Recalcula anchos al redimensionar en vez de usar el valor congelado
        invalidateOnRefresh: true,
      },
    });

    // Limpieza al salir del breakpoint: gsap.matchMedia lo llama solo
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      window.gsap.set(track, { clearProps: 'x' });
      section.classList.remove('is-horizontal');
    };
  });
}
