/**
 * Reveal y SplitHeading — apariciones al hacer scroll
 *
 * El estado oculto lo pone JS, nunca el CSS: si GSAP falla, el contenido se ve.
 * Se usa `fromTo` y no `from`: `ScrollTrigger.refresh()` puede releer el estado
 * inicial como destino y dejar el texto invisible para siempre.
 *
 * SplitHeading se remonta al cambiar de idioma (`key={lang}`). SplitText altera
 * el DOM que React cree controlar: con un elemento nuevo no hay conflicto y el
 * texto traducido se parte desde cero.
 */

import { useEffect, useRef } from 'react';
import { gsap, SplitText } from '../lib/gsap.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { useMotion } from '../hooks/useMotion.js';

const DURATION = 0.9;
const EASE = 'power3.out';
const START = 'top 85%';

/* Entra al bajar y no vuelve atrás. NO usar `once: true`: mata el trigger y
   puede dejar el elemento congelado en su estado inicial. */
const TOGGLE = 'play none none none';

export function Reveal({ as: Tag = 'div', children, ...props }) {
  const ref = useRef(null);
  const motion = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!motion || !el) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(el, { y: 28, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: DURATION,
        ease: EASE,
        scrollTrigger: { trigger: el, start: START, toggleActions: TOGGLE },
      });
    });
    return () => ctx.revert();
  }, [motion]);

  return <Tag ref={ref} {...props}>{children}</Tag>;
}

export function SplitHeading({ as: Tag = 'h2', children, ...props }) {
  const ref = useRef(null);
  const { lang } = useI18n();
  const motion = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!motion || !el) return undefined;

    const ctx = gsap.context(() => {
      SplitText.create(el, {
        type: 'lines,words',
        mask: 'lines',
        wordsClass: 'reveal-word',
        autoSplit: true,
        onSplit: (self) => gsap.fromTo(self.words, { yPercent: 110, opacity: 0 }, {
          yPercent: 0,
          opacity: 1,
          duration: DURATION,
          ease: EASE,
          stagger: 0.035,
          scrollTrigger: { trigger: el, start: START, toggleActions: TOGGLE },
        }),
      });
    });
    return () => ctx.revert();
  }, [motion, lang]);

  return <Tag key={lang} ref={ref} {...props}>{children}</Tag>;
}
