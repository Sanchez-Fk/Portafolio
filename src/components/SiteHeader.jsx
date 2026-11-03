import { useEffect, useRef, useState } from 'react';
import { sections } from '../data/site.js';
import { useI18n } from '../hooks/useI18n.jsx';

/* El inicio ya lo cubre la marca: la navegación lista solo los destinos. */
const links = sections.filter((section) => section.id !== 'hero');

function LangToggle() {
  const { lang, t, toggle } = useI18n();
  return (
    <button type="button" className="lang-toggle" onClick={toggle} aria-label={t('a11y.langToggle')}>
      <span aria-hidden="true" className={lang === 'es' ? 'is-active' : undefined}>ES</span>
      <span aria-hidden="true" className={lang === 'en' ? 'is-active' : undefined}>EN</span>
    </button>
  );
}

function MobileMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const panel = panelRef.current;
    const focusable = () => [...panel.querySelectorAll('a, button')];
    focusable()[0]?.focus();
    document.body.classList.add('menu-open');

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;

      // El foco no se escapa a la página tapada por el menú
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('menu-open');
    };
  }, [open]);

  return (
    <div className="mobile-menu">
      <button
        ref={buttonRef}
        type="button"
        className="mobile-menu__button"
        aria-expanded={open}
        aria-controls="menu-movil"
        onClick={() => setOpen(true)}
      >
        {t('nav.menu')}
      </button>

      <div
        id="menu-movil"
        ref={panelRef}
        className="mobile-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu')}
        hidden={!open}
      >
        <button
          type="button"
          className="mobile-menu__close"
          onClick={() => { setOpen(false); buttonRef.current?.focus(); }}
        >
          {t('a11y.menuClose')}
        </button>
        <ul>
          {links.map(({ id, label }) => (
            <li key={id}>
              <a href={`#${id}`} onClick={() => setOpen(false)}>{t(label)}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { t } = useI18n();

  return (
    <header className="site-header">
      <a className="site-header__brand" href="#hero">
        <span aria-hidden="true">jms/</span>
        <span className="visually-hidden">{t('nav.brand')}</span>
      </a>

      <nav className="site-nav" aria-label={t('a11y.navMain')}>
        <ul>
          {links.map(({ id, label }) => (
            <li key={id}><a href={`#${id}`}>{t(label)}</a></li>
          ))}
        </ul>
      </nav>

      <div className="site-header__tools">
        <LangToggle />
        <MobileMenu />
      </div>
    </header>
  );
}
