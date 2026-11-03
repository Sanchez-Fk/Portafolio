/**
 * FaceStars — el rostro de estrellas del hero
 *
 * Canvas 2D sin WebGL. El rostro es plano y quieto: no gira ni sigue al puntero.
 * Solo titilan las estrellas, y únicamente con movimiento activo, el hero a la
 * vista y la pestaña visible. Mientras corre la intro no se pinta: la intro
 * dibuja este mismo rostro en su sitio y se lo entrega al terminar.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useMotion } from '../hooks/useMotion.js';
import { onIntroChange, introState } from '../experience/introStore.js';
import { onTick } from '../lib/raf.js';
import { drawFace, faceStars, loadFaceStars, starBudget } from './stars.js';

/* Margen del lienzo alrededor de la caja del rostro, para que los halos no se corten */
export const FACE_BLEED = 0.04;

const useIntroState = () => useSyncExternalStore(onIntroChange, introState, () => 'idle');

export function FaceStars() {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const motion = useMotion();
  const intro = useIntroState();
  const hidden = intro === 'playing';
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadFaceStars().then(() => alive && setLoaded(true)).catch((err) => console.warn('[face]', err));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas || hidden || !loaded) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const stars = faceStars();
    const { count, dpr } = starBudget();
    let w = 0;
    let h = 0;

    function resize() {
      const rect = box.getBoundingClientRect();
      w = Math.round(rect.width * dpr);
      h = Math.round(rect.height * dpr);
      canvas.width = Math.round(w * (1 + FACE_BLEED * 2));
      canvas.height = Math.round(h * (1 + FACE_BLEED * 2));
    }

    function paint(seconds) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawFace(ctx, stars, count, w * FACE_BLEED, h * FACE_BLEED, w, h, seconds);
    }

    resize();
    paint(performance.now() / 1000);

    const ro = new ResizeObserver(() => {
      resize();
      paint(performance.now() / 1000);
    });
    ro.observe(box);

    if (!motion) return () => ro.disconnect();

    let visible = true;
    let stop = null;
    const sync = () => {
      const run = visible && !document.hidden;
      if (run && !stop) stop = onTick((_, now) => paint(now / 1000));
      if (!run && stop) { stop(); stop = null; }
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(box);
    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      if (stop) stop();
    };
  }, [motion, hidden, loaded]);

  return (
    <div ref={boxRef} className="hero__face" data-hidden={hidden || undefined}>
      <canvas ref={canvasRef} className="hero__face-canvas" />
    </div>
  );
}
