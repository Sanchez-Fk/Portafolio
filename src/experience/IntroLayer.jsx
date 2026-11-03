/**
 * IntroLayer — el editor que se presenta solo
 *
 * Un editor a pantalla completa escribe jose.ts carácter a carácter. Al
 * terminar, la intro espera: solo se entra con Enter o con el botón
 * "entrar ↩" (en táctil no hay tecla). Un Enter mientras se escribe completa
 * el archivo de golpe; el siguiente abre el portafolio.
 *
 * Al entrar, el editor se recoge hacia arriba y el nombre del hero sube desde
 * su máscara. Con movimiento reducido el código aparece entero, el editor se
 * funde y el hero ya está en su sitio.
 *
 * Diseño: Claude Design, ronda 2, variantes 2b (editor) y 2c (hero).
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useI18n } from '../hooks/useI18n.jsx';
import { gsap } from '../lib/gsap.js';
import { motionEnabled } from '../lib/env.js';
import { onTick } from '../lib/raf.js';
import {
  finishIntro, introIsReplay, introState, onIntroChange, shouldAutoplay, startIntro,
} from './introStore.js';

const HERO_LINE = '[data-hero-line]';
const HERO_REVEAL = '[data-hero-reveal]';

const MS_PER_CHAR = 16;
const LINE_PAUSE = 7;          // un salto de línea pesa como 7 caracteres
const LEAVE_MS = 1000;
const CALM_LEAVE_MS = 400;

function releaseCover() {
  document.documentElement.classList.remove('intro-pending');
}

const useIntroState = () => useSyncExternalStore(onIntroChange, introState, () => 'idle');

export function IntroLayer() {
  const state = useIntroState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (shouldAutoplay()) startIntro();
    else releaseCover();
  }, []);

  useEffect(() => {
    if (state === 'playing') setMounted(true);
  }, [state]);

  if (!mounted) return null;
  return <IntroEditor onExited={() => setMounted(false)} />;
}

/* Cada línea es una lista de [texto, clase]. Las clases pintan la sintaxis. */
function useSource() {
  const { t } = useI18n();
  return useMemo(() => [
    [['// jose.ts', 'c']],
    [['const ', 'k'], ['jose', 'p'], [' = {', 'p']],
    [['  ' + t('intro.code.role') + ': ', 'y'], [`'${t('hero.role')}'`, 's'], [',', 'p']],
    [['  ' + t('intro.code.base') + ': ', 'y'], ["'Antioquia, CO'", 's'], [',', 'p']],
    [['  stack: ', 'y'], ["['React', 'Node.js', 'Python', 'WebSockets']", 's'], [',', 'p']],
    [['  ' + t('intro.code.work') + ': ', 'y'], ["['spartan', 'flowy']", 's'], [',', 'p']],
    [['  ' + t('intro.code.seek') + ': ', 'y'], [t('intro.code.seekValue'), 's'], [',', 'p']],
    [['};', 'p']],
    [],
    [['export default ', 'k'], ['jose', 'p'], [';', 'p']],
  ], [t]);
}

const lineLength = (line) => line.reduce((n, [text]) => n + text.length, 0);

/* Coste de escribir el archivo: caracteres más una pausa por línea */
function totalUnits(source) {
  return source.reduce((n, line) => n + lineLength(line) + LINE_PAUSE, 0);
}

/* Cuántas líneas se ven y cuántos caracteres de la última, para `units` gastados */
function typedUntil(source, units) {
  let left = units;
  for (let i = 0; i < source.length; i++) {
    const len = lineLength(source[i]);
    if (left < len) return { lines: i, chars: left };
    left -= len + LINE_PAUSE;
    if (left < 0) return { lines: i + 1, chars: 0 };
  }
  return { lines: source.length, chars: 0 };
}

function Line({ tokens, limit }) {
  let left = limit ?? Infinity;
  return tokens.map(([text, cls], i) => {
    if (left <= 0) return null;
    const shown = text.slice(0, left);
    left -= text.length;
    return <span key={i} className={`tok-${cls}`}>{shown}</span>;
  });
}

function IntroEditor({ onExited }) {
  const { t } = useI18n();
  const source = useSource();
  const calm = useMemo(() => !motionEnabled(), []);
  const total = useMemo(() => totalUnits(source), [source]);
  const [units, setUnits] = useState(calm ? total : 0);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const unitsRef = useRef(units);
  const leavingRef = useRef(false);

  const typed = units >= total;
  const { lines, chars } = typedUntil(source, units);

  /* --- Montaje: tapa el sitio, bloquea el scroll y esconde el hero -------- */
  useEffect(() => {
    const html = document.documentElement;
    const others = [...document.querySelectorAll('#root > *')].filter((el) => el !== rootRef.current);

    if (introIsReplay()) window.scrollTo({ top: 0, behavior: 'instant' });
    releaseCover();
    html.classList.add('intro-lock');
    others.forEach((el) => { el.inert = true; });
    if (!calm) {
      gsap.set(HERO_LINE, { yPercent: 110 });
      gsap.set(HERO_REVEAL, { opacity: 0, y: 16 });
    }
    buttonRef.current?.focus({ preventScroll: true });

    return () => {
      html.classList.remove('intro-lock');
      others.forEach((el) => { el.inert = false; });
      // Cerrojo: pase lo que pase, el hero no se queda oculto
      if (!leavingRef.current) {
        gsap.set([HERO_LINE, HERO_REVEAL], { clearProps: 'opacity,transform' });
        finishIntro();
      }
    };
  }, [calm]);

  /* --- Escritura: un reloj, pausado si la pestaña se oculta --------------- */
  useEffect(() => {
    if (calm || unitsRef.current >= total) return undefined;
    let elapsed = unitsRef.current * MS_PER_CHAR;
    let last = performance.now();
    const stop = onTick((_, now) => {
      const dt = Math.min(now - last, 100);
      last = now;
      elapsed += dt;
      const next = Math.min(total, Math.floor(elapsed / MS_PER_CHAR));
      if (next !== unitsRef.current) {
        unitsRef.current = next;
        setUnits(next);
      }
      if (next >= total) stop();
    });
    return stop;
  }, [calm, total]);

  /* --- Enter: completa el archivo o abre el portafolio -------------------- */
  useEffect(() => {
    function leave() {
      leavingRef.current = true;
      setLeaving(true);
      finishIntro();

      if (!calm) {
        gsap.to(HERO_LINE, {
          yPercent: 0, duration: 1, delay: 0.25, stagger: 0.12,
          ease: 'expo.out', clearProps: 'transform',
        });
        gsap.to(HERO_REVEAL, {
          opacity: 1, y: 0, duration: 0.8, delay: 0.55, stagger: 0.08,
          ease: 'power3.out', clearProps: 'opacity,transform',
        });
      }
      window.setTimeout(onExited, calm ? CALM_LEAVE_MS : LEAVE_MS);
    }

    function advance() {
      if (leavingRef.current) return;
      if (unitsRef.current < total) {
        unitsRef.current = total;
        setUnits(total);
        return;
      }
      leave();
    }

    const onKey = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      advance();
    };
    const button = buttonRef.current;
    window.addEventListener('keydown', onKey);
    button.addEventListener('click', advance);
    return () => {
      window.removeEventListener('keydown', onKey);
      button.removeEventListener('click', advance);
    };
  }, [calm, total, onExited]);

  return (
    <div
      ref={rootRef}
      className="intro"
      role="dialog"
      aria-modal="true"
      aria-label={t('intro.label')}
      data-leaving={leaving || undefined}
      data-calm={calm || undefined}
    >
      <p className="visually-hidden">{t('intro.sr')}</p>

      <div className="intro__tabs" aria-hidden="true">
        <span className="intro__tab is-active">jose.ts</span>
        <span className="intro__tab">{t('intro.tab')}</span>
      </div>

      <div className="intro__code" aria-hidden="true">
        {source.slice(0, lines + (typed ? 0 : 1)).map((tokens, i) => (
          <div className="intro__line" key={i}>
            <span className="intro__ln">{i + 1}</span>
            <span className="intro__src">
              <Line tokens={tokens} limit={i === lines ? chars : undefined} />
              {i === lines && <span className="intro__caret" />}
            </span>
          </div>
        ))}
        {typed && (
          <div className="intro__line">
            <span className="intro__ln">{source.length + 1}</span>
            <span className="intro__src"><span className="intro__caret" /></span>
          </div>
        )}
      </div>

      <div className="intro__status">
        <span className="intro__mode" data-ready={typed || undefined} aria-hidden="true">
          {typed ? 'NORMAL' : 'INSERT'}
        </span>
        <span className="intro__cmd" aria-hidden="true">{typed ? ':enter' : '-- INSERT --'}</span>
        <span className="intro__hint" data-ready={typed || undefined}>
          <span className="intro__hint-key">{t('intro.hint')}</span>
          <span className="intro__hint-touch">{t('intro.hintTouch')}</span>
        </span>
        <button ref={buttonRef} type="button" className="btn btn--primary intro__enter" data-ready={typed || undefined}>
          {t('intro.enter')}
        </button>
      </div>
    </div>
  );
}
