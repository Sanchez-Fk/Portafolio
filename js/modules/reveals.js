/**
 * reveals.js — apariciones al hacer scroll (GSAP + ScrollTrigger + split-type)
 *
 * Dos tipos:
 *   1. Titulares con [data-split] → se parten en líneas y las palabras suben
 *      desde detrás de una máscara, con stagger.
 *   2. Todo lo demás → fade + translateY.
 *
 * Regla innegociable: el estado oculto lo pone JS, nunca el CSS. Si GSAP no
 * carga, el contenido está visible por defecto en vez de quedarse invisible
 * para siempre.
 *
 * Y se usa `fromTo` con destino explícito, NO `from`: con `from`, GSAP tiene
 * que deducir el valor final leyendo el estilo actual, y `ScrollTrigger
 * .refresh()` vuelve a leerlo cuando el elemento todavía está en su estado
 * inicial. Resultado: graba `opacity: 0` como destino y el texto anima de 0
 * a 0, es decir, no aparece jamás.
 *
 * Cada animación dispara UNA sola vez y no se revierte al subir.
 */

import { prefersReducedMotion } from '../utils/env.js';

/* Elementos que se revelan con un fade simple.
   Los internos de las tarjetas de proyecto quedan fuera a propósito: en
   desktop viajan dentro del carrusel horizontal y ya entran solos. */
const FADE_SELECTORS = [
  '.section__label',
  '.section__lead',
  '.hero__intro',
  '.hero__actions',
  '.hero__scroll-hint',
  '.about__body p',
  '.about__fact',
  '.service',
  '.step',
  '.cta__path',
  '.site-footer__brand',
  '.site-footer__social',
  '.site-footer__meta',
].join(', ');

const DURATION = 0.9;
const EASE = 'power3.out';
const START = 'top 85%';

/* Entra al bajar y no vuelve atras nunca: dispara una sola vez, de hecho.
   NO usar `once: true`: mata el ScrollTrigger en el mismo momento en que
   entra y se lleva la animacion por delante, dejando el elemento congelado
   en su estado inicial (invisible). `toggleActions` consigue lo mismo sin
   ese efecto secundario. */
const TOGGLE = 'play none none none';

let splits = [];
let animations = [];

function clear() {
  animations.forEach((tween) => {
    tween.scrollTrigger?.kill();
    /* `revert()` antes de `kill()` es obligatorio: son tweens `from`, asi que
       matarlos sin mas deja el elemento congelado en su estado inicial
       (opacity 0) y el contenido desaparece para siempre. */
    tween.revert();
    tween.kill();
  });
  animations = [];

  /* `revert()` devuelve al elemento su HTML original y, de paso, limpia la
     cache interna de split-type. Es imprescindible hacerlo ANTES de que
     i18n escriba el idioma nuevo: si se hace despues, la proxima vez que
     partamos el texto split-type restaura lo que tenia cacheado y machaca
     la traduccion. */
  splits.forEach(({ split }) => split.revert());
  splits = [];
}

function buildSplitReveals() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    // 'lines,words' anida: cada .line contiene .word.
    // La máscara la pone .line con overflow hidden (06-sections.css).
    const split = new window.SplitType(el, {
      types: 'lines,words',
      lineClass: 'reveal-line',
      wordClass: 'reveal-word',
    });
    splits.push({ el, split });

    if (!split.words?.length) return;

    animations.push(
      window.gsap.fromTo(
        split.words,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: DURATION,
          ease: EASE,
          stagger: 0.035,
          scrollTrigger: { trigger: el, start: START, toggleActions: TOGGLE },
        }
      )
    );
  });
}

function buildFadeReveals() {
  document.querySelectorAll(FADE_SELECTORS).forEach((el) => {
    animations.push(
      window.gsap.fromTo(
        el,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: DURATION,
          ease: EASE,
          scrollTrigger: { trigger: el, start: START, toggleActions: TOGGLE },
        }
      )
    );
  });
}

function build() {
  buildSplitReveals();
  buildFadeReveals();
  window.ScrollTrigger.refresh();
}

export function initReveals() {
  if (!window.gsap || !window.ScrollTrigger || !window.SplitType) {
    console.warn('[reveals] falta gsap, ScrollTrigger o split-type — el sitio queda estático pero legible');
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger);

  // Con movimiento reducido no se construye nada: el contenido ya está visible.
  if (prefersReducedMotion()) return;

  build();

  /* Cambio de idioma en dos tiempos:
       1. beforelangchange → deshacemos los splits y dejamos el texto limpio
          para que i18n escriba sobre un DOM sin tocar.
       2. langchange → volvemos a construir con el texto ya traducido.
     Lo que este en pantalla vuelve a entrar, que es coherente: el texto
     acaba de cambiar de verdad. */
  document.addEventListener('beforelangchange', clear);

  document.addEventListener('langchange', () => {
    // Un frame de margen para que el navegador recalcule el salto de línea
    requestAnimationFrame(build);
  });

  // Las fuentes cambian dónde parten las líneas: recalcular al terminar de cargar
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => window.ScrollTrigger.refresh());
  }
}
