/**
 * preloader.js — contador real 0-100%
 *
 * El porcentaje NO es un `setTimeout` disfrazado: sale de contar recursos que
 * de verdad se están cargando.
 *
 *   1. Las fuentes (document.fonts.ready)
 *   2. Cada imagen que no sea `loading="lazy"` (el retrato del hero)
 *   3. El evento `load` de la ventana, que incluye GSAP y split-type del CDN
 *
 * Cada uno que termina sube el objetivo. Lo único cosmético es el suavizado:
 * el número mostrado persigue al objetivo con `damp` para que un cargado
 * desde caché no salte de 0 a 100 en un frame y no se lea nada. No se añade
 * ni un milisegundo de espera artificial.
 *
 * Red de seguridad: si algo no responde (CDN caído, imagen rota), a los 6
 * segundos se da por completo. El sitio nunca se queda secuestrado.
 *
 * Sin JS el <noscript> del HTML lo elimina de entrada.
 */

import { onTick } from '../utils/raf.js';
import { prefersReducedMotion } from '../utils/env.js';

const MAX_WAIT = 6000;   // ms antes de rendirse y completar igualmente
const CLOSE_AFTER = 1200;// ms de margen para terminar la cuenta ya cargado todo
const RATE = 5;          // velocidad del suavizado, en 1/segundo
const SNAP = 99;         // a partir de aqui se considera 100

/** Reúne las promesas de lo que realmente hay que esperar. */
function collectTasks() {
  const tasks = [];

  // 1. Fuentes: Instrument Serif, Inter y JetBrains Mono
  if (document.fonts?.ready) tasks.push(document.fonts.ready);

  // 2. Imágenes que no van diferidas — hoy solo el retrato del hero
  document.querySelectorAll('img:not([loading="lazy"])').forEach((img) => {
    if (img.complete) {
      tasks.push(Promise.resolve());
      return;
    }
    tasks.push(new Promise((resolve) => {
      // `error` también resuelve: una imagen rota no puede bloquear la entrada
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    }));
  });

  // 3. Carga completa de la página, scripts del CDN incluidos
  if (document.readyState === 'complete') {
    tasks.push(Promise.resolve());
  } else {
    tasks.push(new Promise((resolve) => {
      window.addEventListener('load', resolve, { once: true });
    }));
  }

  return tasks;
}

/**
 * Arranca el preloader.
 * @returns {Promise<void>} resuelve cuando el panel empieza a retirarse, para
 *          que la entrada del hero se solape con la salida en vez de esperarla.
 */
export function initPreloader() {
  const root = document.getElementById('preloader');
  if (!root) return Promise.resolve();

  const countEl = root.querySelector('[data-preloader-count]');
  const barEl = root.querySelector('[data-preloader-bar]');

  document.body.classList.add('is-loading');

  const tasks = collectTasks();
  const total = tasks.length || 1;
  let done = 0;
  let target = 0;
  let shown = 0;

  return new Promise((resolve) => {
    let finished = false;
    let closeTimer = null;

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      clearTimeout(closeTimer);
      stopTick();
      exit(root, resolve);
    }

    tasks.forEach((task) => {
      Promise.resolve(task)
        .catch(() => {})
        .then(() => {
          done += 1;
          target = (done / total) * 100;
        });
    });

    /* Cerrojos basados en setTimeout, NO en el bucle de animacion.
       `requestAnimationFrame` se estrangula en pestanas de fondo y en equipos
       cargados: si el cierre dependiera solo de el, el panel podria quedarse
       puesto para siempre. Vistos 1 frame/segundo en pruebas reales. */

    // 1. Todo cargado: se le da margen a la cuenta y se cierra si o si
    Promise.allSettled(tasks).then(() => {
      target = 100;
      closeTimer = setTimeout(finish, CLOSE_AFTER);
    });

    // 2. Algo no contesta (CDN caido, imagen rota): se cierra igualmente
    const guard = setTimeout(finish, MAX_WAIT);

    /* El suavizado va por tiempo real, no por numero de frames. Con `damp`
       sobre el delta de frames, una maquina a 1fps avanzaba ~1% por segundo
       y el contador se quedaba clavado en 25 mientras todo estaba cargado. */
    let last = performance.now();

    const stopTick = onTick(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.25);   // segundos, con tope
      last = now;

      // Interpolacion exponencial estable a cualquier framerate
      shown += (target - shown) * (1 - Math.exp(-RATE * dt));

      // Al llegar arriba redondeamos y salimos
      if (target >= 100 && shown >= SNAP) shown = 100;

      const value = Math.min(100, Math.round(shown));
      if (countEl) countEl.textContent = String(value);
      if (barEl) barEl.style.setProperty('--progress', `${shown.toFixed(1)}%`);

      if (shown === 100) finish();
    });
  });
}

/** Retira el panel y resuelve a mitad de la salida. */
function exit(root, resolve) {
  let cleaned = false;
  const done = () => {
    if (cleaned) return;
    cleaned = true;
    root.remove();
    document.body.classList.remove('is-loading');
  };

  // Sin movimiento: fuera de inmediato
  if (prefersReducedMotion() || !window.gsap) {
    done();
    resolve();
    return;
  }

  /* Cerrojos independientes de la animacion.
     GSAP trae `lagSmoothing` activado: cuando un frame tarda mas de 500ms
     finge que solo pasaron 33ms, para que las animaciones no den saltos. El
     efecto secundario es que en un equipo ahogado una salida de 1,4s puede
     tardar decenas de segundos — y con ella se iba la retirada del panel.
     Ni el DOM ni el arranque del sitio pueden depender de eso. */
  const forceDone = setTimeout(done, 2400);
  const forceResolve = setTimeout(resolve, 900);

  const tl = window.gsap.timeline({
    onComplete: () => { clearTimeout(forceDone); done(); },
  });

  tl.to(root.querySelectorAll('.preloader__label, .preloader__counter'), {
      y: -24,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.in',
      stagger: 0.06,
    })
    .to(root, {
      yPercent: -100,
      duration: 0.9,
      ease: 'expo.inOut',
    }, '-=0.15')
    /* El hero arranca cuando el panel ya se está levantando, no después:
       así la entrada se solapa con la salida en vez de encadenarse. */
    .add(() => { clearTimeout(forceResolve); resolve(); }, '-=0.55');
}
