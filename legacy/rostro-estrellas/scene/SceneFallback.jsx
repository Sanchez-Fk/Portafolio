/**
 * SceneFallback — Deep Space sin WebGL
 *
 * Solo CSS e imágenes estáticas. Es decorativo, va fijo detrás del contenido y
 * el parallax mueve únicamente `transform`, así que no provoca reflow.
 * Desde la Fase 4.2 será la alternativa de los equipos sin WebGL.
 */

import { useEffect, useRef } from 'react';
import { useMotion } from '../hooks/useMotion.js';

const FAR = 0.02;
const NEAR = 0.05;

export function SceneFallback() {
  const farRef = useRef(null);
  const nearRef = useRef(null);
  const motion = useMotion();

  useEffect(() => {
    const far = farRef.current;
    const near = nearRef.current;
    if (!motion || !far || !near) return undefined;

    let frame = null;
    function paint() {
      frame = null;
      const y = window.scrollY;
      far.style.transform = `translate3d(0, ${(-y * FAR).toFixed(1)}px, 0)`;
      near.style.transform = `translate3d(0, ${(-y * NEAR).toFixed(1)}px, 0)`;
    }
    function onScroll() {
      if (frame === null) frame = requestAnimationFrame(paint);
    }

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
      far.style.transform = '';
      near.style.transform = '';
    };
  }, [motion]);

  return (
    <div className="scene" aria-hidden="true">
      <div className="scene__nebula" />
      <div ref={farRef} className="scene__stars scene__stars--far" />
      <div ref={nearRef} className="scene__stars scene__stars--near" />
    </div>
  );
}
