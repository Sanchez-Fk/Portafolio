/**
 * IntroLayer — el viaje de la intro, sin WebGL
 *
 *   0 → 3     nombre sobre el espacio
 *   3 → 16    crawl en perspectiva (13 s; 10 s en móvil)
 *   +2        las estrellas empiezan a estirarse
 *   +3        hipervelocidad: líneas que pasan junto a la cámara
 *   +3        las líneas se recogen en puntos y viajan hasta formar el rostro
 *   +4        el fondo se abre, el texto del hero entra y la intro cede el sitio
 *
 * Todo sale de un único reloj y un único bucle (raf.js). Las estrellas del
 * rostro terminan en la caja de `.hero__face` con el mismo dibujo que usa el
 * hero, así que el relevo es invisible.
 *
 * Se salta con el botón, con Esc o al intentar hacer scroll. Con movimiento
 * reducido nunca arranca sola; si se pide desde el pie, se ve una versión con
 * fundidos y sin viaje.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useI18n } from '../hooks/useI18n.jsx';
import { gsap } from '../lib/gsap.js';
import { motionEnabled } from '../lib/env.js';
import { onTick } from '../lib/raf.js';
import {
  drawFace, faceStars, loadFaceStars, starAlpha, starBudget, starSize, starSprites, twinkle,
} from '../scene/stars.js';
import {
  finishIntro, introIsReplay, introState, onIntroChange, shouldAutoplay, startIntro,
} from './introStore.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const HERO_REVEAL = '[data-hero-reveal]';
const EXIT_MS = 650;

function timeline(small) {
  const crawlEnd = small ? 13 : 16;
  const accelEnd = crawlEnd + 2;
  const warpEnd = accelEnd + 3;
  const gatherEnd = warpEnd + 3;
  return { nameEnd: 3, crawlEnd, accelEnd, warpEnd, gatherEnd, end: gatherEnd + 4 };
}

/* Versión con movimiento reducido: solo fundidos */
const CALM = { nameEnd: 3, textOut: 13, textEnd: 14, faceEnd: 16.5, end: 18.5 };

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

  // Espera a los datos del rostro; si no llegan, la intro no tapa el sitio
  useEffect(() => {
    if (state !== 'playing') return undefined;
    let alive = true;
    loadFaceStars()
      .then(() => alive && setMounted(true))
      .catch((err) => {
        console.warn('[intro]', err);
        releaseCover();
        finishIntro();
      });
    return () => { alive = false; };
  }, [state]);

  if (!mounted) return null;
  return <IntroPlayer onExited={() => setMounted(false)} />;
}

function IntroPlayer({ onExited }) {
  const { t } = useI18n();
  const rootRef = useRef(null);
  const backdropRef = useRef(null);
  const canvasRef = useRef(null);
  const nameRef = useRef(null);
  const crawlRef = useRef(null);
  const skipRef = useRef(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const html = document.documentElement;
    const calm = !motionEnabled();
    const small = window.matchMedia('(max-width: 767px)').matches;
    const T = timeline(small);
    const { count, field, dpr } = starBudget();
    const face = faceStars();
    const sprites = starSprites();
    const faceBox = document.querySelector('.hero__face');
    const heroText = gsap.utils.toArray(HERO_REVEAL);

    if (introIsReplay()) window.scrollTo({ top: 0, behavior: 'instant' });
    releaseCover();
    html.classList.add('intro-lock');
    gsap.set(heroText, { opacity: 0, y: 24 });
    skipRef.current?.focus({ preventScroll: true });

    /* --- Lienzo y caja final del rostro ---------------------------------- */
    let W = 0, H = 0;
    const target = { x: 0, y: 0, w: 0, h: 0 };
    function resize() {
      W = canvas.width = Math.round(window.innerWidth * dpr);
      H = canvas.height = Math.round(window.innerHeight * dpr);
      const r = faceBox?.getBoundingClientRect();
      if (r && r.width) {
        target.x = r.left * dpr;
        target.y = r.top * dpr;
        target.w = r.width * dpr;
        target.h = r.height * dpr;
      } else {
        // Sin caja en el hero: el rostro se queda centrado
        target.h = H * 0.7;
        target.w = target.h * 0.64;
        target.x = (W - target.w) / 2;
        target.y = (H - target.h) / 2;
      }
    }
    resize();
    window.addEventListener('resize', resize);

    /* --- Estrellas: posición 3D para el viaje, destino en el rostro ------- */
    const N = calm ? 0 : Math.min(count, face.n) + field;
    const faceCount = Math.min(count, face.n);
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
    const delay = new Float32Array(N);
    const fresh = new Float32Array(N);
    const spread = () => ({ x: (W / H) * 1.25, y: 1.25 });
    function spawn(i, z) {
      const s = spread();
      px[i] = (Math.random() * 2 - 1) * s.x;
      py[i] = (Math.random() * 2 - 1) * s.y;
      pz[i] = z;
      fresh[i] = 0;
    }
    for (let i = 0; i < N; i++) {
      spawn(i, 0.08 + Math.random() * 0.92);
      fresh[i] = 1;
      delay[i] = Math.random() * 1.3;
    }

    function speedAt(s) {
      if (s < T.crawlEnd) return 0.012;
      if (s < T.accelEnd) return 0.012 + Math.pow(smooth(T.crawlEnd, T.accelEnd, s), 2) * 1.5;
      if (s < T.warpEnd) return 1.5;
      return 1.5 * (1 - smooth(T.warpEnd - 0.2, T.warpEnd + 1.4, s));
    }

    /* --- Capas DOM ------------------------------------------------------- */
    const crawl = crawlRef.current;
    const name = nameRef.current;
    const backdrop = backdropRef.current;
    const skipBtn = skipRef.current;
    let crawlH = crawl.offsetHeight;

    function paintDom(s) {
      if (calm) {
        name.style.opacity = smooth(0.3, 1.2, s) * (1 - smooth(2.2, 3, s));
        crawl.style.opacity = smooth(3.2, 4.2, s) * (1 - smooth(CALM.textOut, CALM.textEnd, s));
        backdrop.style.opacity = 1 - smooth(CALM.faceEnd, CALM.end - 0.3, s);
        return;
      }
      name.style.opacity = smooth(0.4, 1.3, s) * (1 - smooth(2.1, 2.9, s));
      name.style.transform = `scale(${1 + s * 0.015})`;
      const k = clamp01((s - T.nameEnd) / (T.crawlEnd - T.nameEnd));
      const vh = window.innerHeight;
      const y = vh * 0.1 - k * (crawlH * 0.75 + vh * 1.25);
      crawl.style.transform = `rotateX(50deg) translate3d(0, ${y.toFixed(1)}px, 0)`;
      crawl.style.opacity = smooth(T.nameEnd - 0.2, T.nameEnd + 0.6, s) * (1 - smooth(T.crawlEnd - 1.2, T.crawlEnd + 0.4, s));
      backdrop.style.opacity = 1 - smooth(T.gatherEnd - 0.4, T.gatherEnd + 1.8, s);
      // El botón se retira cuando entra el hero, para no tapar los controles del header
      skipBtn.style.opacity = 1 - smooth(T.gatherEnd + 0.3, T.gatherEnd + 0.9, s);
    }

    /* --- Dibujo ---------------------------------------------------------- */
    const paintFace = (alpha, seconds) =>
      drawFace(ctx, face, faceCount, target.x, target.y, target.w, target.h, seconds, alpha);

    const lineColors = ['rgba(255,255,255,', 'rgba(181,140,255,', 'rgba(110,155,255,'];
    const paths = [[], [], []];

    function paintJourney(s, dt, seconds) {
      const v = speedAt(s);
      const F = H * 0.55;
      const cx = W / 2, cy = H / 2;
      const streak = smooth(0.08, 0.6, v);
      const tail = Math.min(0.35, v * 0.12);
      const fieldFade = 1 - smooth(T.warpEnd, T.warpEnd + 1.5, s);
      const gatherStart = T.warpEnd - 0.9;

      ctx.globalCompositeOperation = 'lighter';
      paths[0].length = paths[1].length = paths[2].length = 0;

      for (let i = 0; i < N; i++) {
        const isFace = i < faceCount;
        const g = isFace ? easeInOut(clamp01((s - gatherStart - delay[i]) / 1.9)) : 0;

        // Hasta que empieza a reunirse, cada estrella viaja hacia la cámara
        if (g === 0) {
          pz[i] -= v * dt;
          fresh[i] = Math.min(1, fresh[i] + dt * 1.5);
          if (pz[i] < 0.05) spawn(i, 1);
        }

        const z = pz[i];
        const sx = cx + (px[i] / z) * F;
        const sy = cy + (py[i] / z) * F;
        const depth = Math.pow(1 - z, 1.4);
        let alpha = (0.18 + depth * 0.82) * fresh[i];
        if (!isFace) alpha *= fieldFade;
        if (alpha <= 0.002) continue;

        // Estela: del punto donde estaba hace un instante al actual
        if (streak > 0.01 && g < 0.5) {
          const tz = z + tail;
          const tx = cx + (px[i] / tz) * F;
          const ty = cy + (py[i] / tz) * F;
          const k = isFace ? 1 - g * 2 : 1;
          paths[i % 3].push(tx + (sx - tx) * (1 - k), ty + (sy - ty) * (1 - k), sx, sy);
        }

        const b = isFace ? face.bright[i] : 0.4;
        let x = sx, y = sy;
        let size = (H / 900) * (2.5 + depth * 6);
        let a = alpha * (1 - streak * 0.6);
        if (g > 0) {
          const fx = target.x + face.u[i] * target.w;
          const fy = target.y + face.v[i] * target.h;
          x = sx + (fx - sx) * g;
          y = sy + (fy - sy) * g;
          size += (starSize(b, target.h) - size) * g;
          const finalA = starAlpha(b) * twinkle(face, i, seconds);
          a += (finalA - a) * g;
        }
        ctx.globalAlpha = a;
        ctx.drawImage(sprites[isFace ? face.tint[i] : i % 3], x - size / 2, y - size / 2, size, size);
      }

      if (streak > 0.01) {
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, (H / 900) * 1.6);
        for (let c = 0; c < 3; c++) {
          const p = paths[c];
          if (!p.length) continue;
          ctx.strokeStyle = `${lineColors[c]}${(0.75 * streak).toFixed(3)})`;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          for (let j = 0; j < p.length; j += 4) {
            ctx.moveTo(p[j], p[j + 1]);
            ctx.lineTo(p[j + 2], p[j + 3]);
          }
          ctx.stroke();
        }
      }

      // Centro oscuro durante la hipervelocidad: sin túnel ni destello
      if (streak > 0.2) {
        const r = Math.min(W, H) * 0.14;
        const dark = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        dark.addColorStop(0, `rgba(5,4,10,${0.9 * streak})`);
        dark.addColorStop(1, 'rgba(5,4,10,0)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = dark;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    /* --- Bucle ----------------------------------------------------------- */
    const end = calm ? CALM.end : T.end;
    const heroAt = calm ? CALM.faceEnd : T.gatherEnd + 0.3;
    let start = performance.now();
    let last = start;
    let heroShown = false;
    let closed = false;

    function showHero(fast) {
      if (heroShown) return;
      heroShown = true;
      gsap.to(heroText, {
        opacity: 1, y: 0,
        duration: fast ? 0.5 : 1.1,
        ease: 'power3.out',
        stagger: fast ? 0 : 0.12,
        clearProps: 'opacity,transform',
      });
    }

    function close(fast) {
      if (closed) return;
      closed = true;
      showHero(fast);
      finishIntro();
      setExiting(true);
      window.setTimeout(onExited, fast ? EXIT_MS : 0);
    }

    // Si la pestaña se oculta, el reloj se pausa: la intro no avanza a ciegas
    let hiddenAt = 0;
    function onVisibility() {
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt) { start += performance.now() - hiddenAt; last = performance.now(); hiddenAt = 0; }
    }
    document.addEventListener('visibilitychange', onVisibility);

    const stop = onTick((_, now) => {
      if (closed) return;
      const s = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const seconds = now / 1000;

      paintDom(s);
      ctx.clearRect(0, 0, W, H);
      if (calm) {
        paintFace(smooth(CALM.textEnd, CALM.faceEnd, s), 0);
      } else {
        paintJourney(s, dt, seconds);
      }

      if (s >= heroAt) showHero(false);
      if (s >= end) close(false);
    });

    /* --- Saltar ---------------------------------------------------------- */
    const SKIP_KEYS = new Set(['Escape', ' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'End', 'Home']);
    const skip = () => close(true);
    const onKey = (e) => {
      if (!SKIP_KEYS.has(e.key)) return;
      // Espacio sobre el botón ya lo pulsa: no hace falta saltar dos veces
      if (e.key === ' ' && e.target === skipRef.current) return;
      e.preventDefault();
      skip();
    };
    const onWheel = (e) => { e.preventDefault(); skip(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchmove', onWheel, { passive: false });
    root.addEventListener('click', (e) => { if (e.target === skipRef.current) skip(); });

    const ro = new ResizeObserver(() => { crawlH = crawl.offsetHeight; });
    ro.observe(crawl);

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onWheel);
      document.removeEventListener('visibilitychange', onVisibility);
      html.classList.remove('intro-lock');
      // Cerrojo: pase lo que pase, el hero no se queda oculto
      if (!closed) {
        gsap.set(heroText, { clearProps: 'opacity,transform' });
        finishIntro();
      }
    };
  }, [onExited]);

  return (
    <div
      ref={rootRef}
      className="intro"
      role="region"
      aria-label={t('intro.label')}
      data-exiting={exiting || undefined}
      data-calm={!motionEnabled() || undefined}
    >
      <div ref={backdropRef} className="intro__backdrop" />
      <canvas ref={canvasRef} className="intro__canvas" aria-hidden="true" />
      <p ref={nameRef} className="intro__name" aria-hidden="true">{t('hero.name')}</p>
      <div className="intro__crawl-wrap">
        <div ref={crawlRef} className="intro__crawl">
          <p>{t('intro.p1')}</p>
          <p>{t('intro.p2')}</p>
          <p>{t('intro.p3')}</p>
        </div>
      </div>
      <button ref={skipRef} type="button" className="intro__skip">{t('intro.skip')}</button>
    </div>
  );
}
