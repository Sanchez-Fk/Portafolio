import { useEffect, useRef } from 'react';
import { SplitHeading, Reveal } from '../components/Reveal.jsx';
import { skillGroups } from '../data/site.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { useMotion } from '../hooks/useMotion.js';
import { gsap, ScrollTrigger } from '../lib/gsap.js';

/* --- Espiral --------------------------------------------------------------
   Las habilidades salen del centro de una en una, en orden revuelto, y giran
   hacia fuera hasta su sitio siguiendo el scroll. En escritorio la rejilla se fija mientras dura;
   en pantallas donde no cabe, cada grupo hace su propia espiral sin fijarse.
   Sin movimiento no se toca nada: la lista ya está ordenada desde el HTML. */

const TURNS = 1.1;        // vueltas que da cada habilidad antes de posarse
const OVERLAP = 0.5;      // la siguiente sale cuando la anterior va por la mitad
const LABELS_AT = 0.88;   // los títulos aparecen al final, cuando ya salieron todas
const CORE = 36;          // radio del revoltijo inicial, en px
const PIN_MEDIA = '(min-width: 1024px) and (min-height: 720px)';

const ease = gsap.parseEase('power2.out');
const clamp01 = gsap.utils.clamp(0, 1);

/* Azar fijo por índice: el revoltijo es el mismo en cada visita */
const noise = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function spiral(unit, scrollTrigger) {
  const items = [...unit.querySelectorAll('li')];
  const labels = [...unit.querySelectorAll('h3, p')];
  let paths = [];

  function measure() {
    items.forEach((el) => { el.style.transform = ''; });
    const box = unit.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    // Orden de salida revuelto, pero una detrás de otra
    const rank = items.map((_, i) => i).sort((a, b) => noise(a + 100) - noise(b + 100));
    const step = LABELS_AT / (items.length + OVERLAP);
    paths = items.map((el, i) => {
      const r = el.getBoundingClientRect();
      const tx = r.left + r.width / 2 - cx;
      const ty = r.top + r.height / 2 - cy;
      return {
        tx, ty,
        radius: Math.hypot(tx, ty),
        angle: Math.atan2(ty, tx),
        core: CORE * noise(i),
        start: rank.indexOf(i) * step,
        length: step * (1 + OVERLAP),
        spin: (noise(i + 50) - 0.5) * 50,
      };
    });
  }

  function render(progress) {
    items.forEach((el, i) => {
      const p = paths[i];
      if (!p) return;
      const local = clamp01((progress - p.start) / p.length);
      const k = 1 - ease(local);
      if (k === 0) {
        el.style.transform = '';
        el.style.opacity = '';
        return;
      }
      const radius = p.core + (p.radius - p.core) * (1 - k);
      const angle = p.angle + k * TURNS * Math.PI * 2;
      const x = Math.cos(angle) * radius - p.tx;
      const y = Math.sin(angle) * radius - p.ty;
      el.style.transform = `translate(${x}px, ${y}px) rotate(${p.spin * k}deg) scale(${1 - 0.3 * k})`;
      el.style.opacity = clamp01(local * 4);
    });
    const fade = clamp01((progress - LABELS_AT) / (1 - LABELS_AT));
    labels.forEach((el) => { el.style.opacity = fade; });
  }

  const st = ScrollTrigger.create({
    trigger: unit,
    scrub: 0.6,
    ...scrollTrigger,
    onRefresh: (self) => { measure(); render(self.progress); },
    onUpdate: (self) => render(self.progress),
  });
  measure();
  render(st.progress);

  return () => {
    st.kill();
    [...items, ...labels].forEach((el) => { el.style.transform = ''; el.style.opacity = ''; });
  };
}

function useSkillSpiral(ref) {
  const motion = useMotion();
  const { lang } = useI18n();

  useEffect(() => {
    const root = ref.current;
    if (!motion || !root) return undefined;

    const mm = gsap.matchMedia();
    mm.add({ pinned: PIN_MEDIA, loose: `not all and ${PIN_MEDIA}` }, ({ conditions }) => {
      if (conditions.pinned) {
        return spiral(root, { start: 'center center', end: '+=280%', pin: true });
      }
      const undo = [...root.children].map((group) => (
        spiral(group, { start: 'top 85%', end: 'bottom 55%' })
      ));
      return () => undo.forEach((fn) => fn());
    });
    return () => mm.revert();
  }, [ref, motion, lang]);
}

export function Skills() {
  const { t } = useI18n();
  const groupsRef = useRef(null);
  useSkillSpiral(groupsRef);

  return (
    <section id="habilidades" className="skills" aria-labelledby="skills-title">
      <SplitHeading id="skills-title" className="section__title">{t('skills.title')}</SplitHeading>
      <Reveal as="p" className="section__lead">{t('skills.lead')}</Reveal>

      <div ref={groupsRef} className="skills__groups">
        {skillGroups.map((group) => (
          <div key={group.title} className={`skill-group${group.quiet ? ' skill-group--quiet' : ''}`}>
            <h3>{t(group.title)}</h3>
            <ul>
              {group.items.map((item) => {
                const label = item.key ?? t(item.t);
                return (
                  <li key={item.key ?? item.t}>
                    {item.logo && (
                      <span
                        className="skill-logo"
                        aria-hidden="true"
                        style={{ '--logo': `url("${item.logo}")` }}
                      />
                    )}
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="skill-group skill-group--quiet">
          <h3>{t('skills.langTitle')}</h3>
          <p>{t('skills.langValue')}</p>
        </div>
      </div>
    </section>
  );
}
