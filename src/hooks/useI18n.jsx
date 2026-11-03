/**
 * useI18n — toggle ES / EN
 *
 * El español viaja en el bundle porque es lo que se prerenderiza. El inglés
 * se pide solo la primera vez que hace falta. Si falla, el sitio se queda en
 * el idioma actual; si falta una clave, ese texto se queda en español.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import es from '../i18n/es.json';

const STORAGE_KEY = 'jms-lang';
const DEFAULT_LANG = 'es';
const ALT_LANG = 'en';

const I18nContext = createContext({
  lang: DEFAULT_LANG,
  t: (key) => es[key] ?? key,
  toggle: () => {},
});

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [en, setEn] = useState(null);

  const switchTo = useCallback(async (next) => {
    if (next === DEFAULT_LANG) {
      setLang(DEFAULT_LANG);
    } else {
      try {
        const module = await import('../i18n/en.json');
        setEn(module.default);
        setLang(ALT_LANG);
      } catch (err) {
        console.warn('[i18n]', err);
        return;
      }
    }
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* modo privado */ }
  }, []);

  // Se lee después de hidratar: el HTML prerenderizado siempre está en español
  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* modo privado */ }
    if (saved === ALT_LANG) switchTo(ALT_LANG);
  }, [switchTo]);

  const value = useMemo(() => {
    const dict = lang === ALT_LANG && en ? en : es;
    return {
      lang,
      t: (key) => dict[key] ?? es[key] ?? key,
      toggle: () => switchTo(lang === DEFAULT_LANG ? ALT_LANG : DEFAULT_LANG),
    };
  }, [lang, en, switchTo]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = value.t('meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', value.t('meta.description'));
  }, [lang, value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
