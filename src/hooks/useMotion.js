/**
 * useMotion — ¿hay que animar ahora mismo?
 *
 * Se suscribe a env.js, así que todo lo que dependa de este hook se reconstruye
 * sin recargar al pulsar el interruptor del pie o cambiar el ajuste del sistema.
 * En el servidor responde `false`: el HTML prerenderizado nunca nace oculto.
 */

import { useSyncExternalStore } from 'react';
import { motionEnabled, onEnvChange } from '../lib/env.js';

export function useMotion() {
  return useSyncExternalStore(onEnvChange, motionEnabled, () => false);
}
