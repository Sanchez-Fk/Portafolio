import { contact } from '../data/site.js';
import { useI18n } from '../hooks/useI18n.jsx';

/* Cada letra es su propio bloque para levantarse al pasar el puntero. Las
   palabras no se parten: en móvil el renglón se corta entre palabras. */
function Letters({ text }) {
  return text.split(' ').map((word, w) => (
    <span className="hero__word" key={w}>
      {[...word].map((ch, i) => <span className="hero__char" key={i}>{ch}</span>)}
    </span>
  ));
}

/* El hero no anima su entrada por sí mismo: lo hace la intro al pulsar Enter
   (`data-hero-line` sube desde la máscara, `data-hero-reveal` se funde). Sin
   intro, todo está visible desde el prerender. */
export function Hero() {
  const { t } = useI18n();

  return (
    <section id="hero" className="hero">
      <p className="hero__kicker" data-hero-reveal>
        <span className="hero__prompt">~/jose</span> {t('hero.role')} · Antioquia, CO
      </p>

      <h1 className="hero__title">
        <span className="visually-hidden">{t('hero.name')}</span>
        <span className="hero__line" aria-hidden="true">
          <span className="hero__line-inner" data-hero-line><Letters text={t('hero.nameFirst')} /></span>
        </span>
        <span className="hero__line hero__line--quiet" aria-hidden="true">
          <span className="hero__line-inner" data-hero-line><Letters text={t('hero.nameLast')} /></span>
        </span>
      </h1>

      <div className="hero__body" data-hero-reveal>
        <p className="hero__intro">{t('hero.intro')}</p>
        <p className="hero__status">
          <span className="pulse-dot" aria-hidden="true" />
          {t('hero.avail')}
        </p>
      </div>

      <a className="hero__path" href={contact.cv} download data-hero-reveal>
        <span className="hero__path-n">01.</span>
        <span className="hero__path-title">{t('cta.hire.title')}</span>
        <span className="hero__path-desc">{t('hero.path1')}</span>
        <span className="hero__path-action">{t('cta.hire.cv')} ↓</span>
      </a>

      <a className="hero__path" href={contact.whatsapp} target="_blank" rel="noopener" data-hero-reveal>
        <span className="hero__path-n">02.</span>
        <span className="hero__path-title">{t('cta.client.title')}</span>
        <span className="hero__path-desc">{t('hero.path2')}</span>
        <span className="hero__path-action">{t('cta.client.whatsapp')} ↗</span>
      </a>
    </section>
  );
}
