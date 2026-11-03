/**
 * JourneyRail — indicador de sección y de avance, solo en pantallas anchas
 *
 * El avance se escribe directo en una variable CSS: actualizarlo con estado de
 * React rerenderizaría el componente en cada evento de scroll.
 */

import { useEffect, useRef, useState } from 'react';
import { sections } from '../data/site.js';
import { useI18n } from '../hooks/useI18n.jsx';

export function JourneyRail() {
  const { t } = useI18n();
  const [current, setCurrent] = useState(sections[0].id);
  const railRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = null;

    function paint() {
      frame = null;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      railRef.current?.style.setProperty('--journey', progress.toFixed(4));
    }
    function onScroll() {
      if (frame === null) frame = requestAnimationFrame(paint);
    }

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav ref={railRef} className="journey" aria-label={t('a11y.navJourney')}>
      <ul>
        {sections.map(({ id, label }) => (
          <li key={id}>
            <a href={`#${id}`} aria-current={current === id ? 'true' : undefined}>
              <span className="journey__label">{t(label)}</span>
              <span className="journey__dot" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
