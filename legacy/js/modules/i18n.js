/**
 * i18n — toggle ES / EN
 *
 * El español NO vive en un JSON: vive en el HTML, porque el sitio tiene que
 * ser legible sin JavaScript. Al arrancar tomamos una foto de los textos del
 * DOM y esa foto es la fuente de verdad del español. Solo el inglés se pide
 * por red, y solo la primera vez que se pide.
 *
 * Contrato de marcado:
 *   data-i18n="clave"                → reemplaza textContent
 *   data-i18n-attr="atributo:clave"  → reemplaza un atributo
 *                                      (varios separados por coma)
 *
 * Emite el evento 'langchange' en document para que la Fase 5 pueda
 * rehacer los splits de texto cuando el contenido cambia.
 */

const STORAGE_KEY = 'jms-lang';
const DEFAULT_LANG = 'es';
const ALT_LANG = 'en';

/** Traducciones en memoria. El español se rellena desde el DOM. */
const dictionaries = { es: {}, en: null };

/** Parsea "aria-label:a11y.skip, title:otra.clave" → [[attr, key], ...] */
function parseAttrMap(value) {
  return value
    .split(',')
    .map((pair) => pair.split(':').map((s) => s.trim()))
    .filter((pair) => pair.length === 2 && pair[0] && pair[1]);
}

/** Toma la foto del español tal y como está escrito en el HTML. */
function snapshotSpanish() {
  const dict = dictionaries.es;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    // Normaliza el espacio en blanco del HTML indentado
    dict[el.dataset.i18n] = el.textContent.replace(/\s+/g, ' ').trim();
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    parseAttrMap(el.dataset.i18nAttr).forEach(([attr, key]) => {
      dict[key] = el.getAttribute(attr) ?? '';
    });
  });

  // El <title> no lleva data-i18n-attr; se guarda aparte
  dict['meta.title'] = document.title;
}

/** Descarga en.json una sola vez. */
async function loadDictionary(lang) {
  if (dictionaries[lang]) return dictionaries[lang];

  const res = await fetch(`i18n/${lang}.json`);
  if (!res.ok) throw new Error(`No se pudo cargar i18n/${lang}.json (${res.status})`);

  dictionaries[lang] = await res.json();
  return dictionaries[lang];
}

/** Escribe un diccionario completo sobre el DOM. */
function render(dict) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = dict[el.dataset.i18n];
    if (typeof value === 'string') el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    parseAttrMap(el.dataset.i18nAttr).forEach(([attr, key]) => {
      const value = dict[key];
      if (typeof value === 'string') el.setAttribute(attr, value);
    });
  });

  if (typeof dict['meta.title'] === 'string') document.title = dict['meta.title'];
}

/** Marca visualmente qué idioma está activo dentro del botón. */
function paintToggle(button, lang) {
  button.querySelectorAll('[data-lang-code]').forEach((span) => {
    span.classList.toggle('is-active', span.dataset.langCode === lang);
  });
}

export function initI18n() {
  const button = document.querySelector('[data-lang-toggle]');
  if (!button) return;

  snapshotSpanish();

  let current = DEFAULT_LANG;

  async function setLang(lang) {
    if (lang === current) return;

    try {
      const dict = lang === DEFAULT_LANG
        ? dictionaries[DEFAULT_LANG]
        : await loadDictionary(lang);

      /* Aviso previo: quien haya manipulado el DOM del texto (split-type en
         la Fase 5) tiene que deshacerlo AHORA. split-type cachea el HTML
         original del elemento, asi que si se re-parte despues de traducir,
         restaura el idioma viejo por encima del nuevo. */
      document.dispatchEvent(new CustomEvent('beforelangchange', { detail: { lang } }));

      render(dict);
    } catch (err) {
      // Si el JSON falla, el sitio se queda en el idioma actual y sigue usable.
      console.warn('[i18n]', err);
      return;
    }

    current = lang;
    document.documentElement.lang = lang;
    paintToggle(button, lang);

    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* modo privado */ }

      // Ya con el texto nuevo puesto: la Fase 5 vuelve a partirlo
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  button.addEventListener('click', () => {
    setLang(current === DEFAULT_LANG ? ALT_LANG : DEFAULT_LANG);
  });

  paintToggle(button, current);

  // Restaura la preferencia guardada
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* modo privado */ }
  if (saved && saved !== current) setLang(saved);
}
