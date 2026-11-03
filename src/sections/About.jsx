import { Reveal, SplitHeading } from '../components/Reveal.jsx';
import { useI18n } from '../hooks/useI18n.jsx';

const FACTS = ['Base', 'Focus', 'Avail'];

export function About() {
  const { t } = useI18n();

  return (
    <section id="sobre-mi" className="about" aria-labelledby="about-title">
      <SplitHeading id="about-title" className="section__title">{t('about.title')}</SplitHeading>

      <div className="about__grid">
        <Reveal as="figure" className="about__portrait">
          <picture>
            <source
              type="image/webp"
              srcSet="/img/jose-800.webp 800w, /img/jose.webp 1199w"
              sizes="(min-width: 1024px) 60vw, 190vw"
            />
            <img
              src="/img/jose.jpg"
              srcSet="/img/jose-800.jpg 800w, /img/jose.jpg 1199w"
              sizes="(min-width: 1024px) 60vw, 190vw"
              alt={t('a11y.photo')}
              width="1199"
              height="1600"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </Reveal>

        <div className="about__body">
          <Reveal as="p">{t('about.p1')}</Reveal>
          <Reveal as="p">{t('about.p2')}</Reveal>
          <Reveal as="p">{t('about.p3')}</Reveal>
        </div>
      </div>

      <dl className="about__facts">
        {FACTS.map((fact) => (
          <Reveal key={fact} className="about__fact">
            <dt>{t(`about.fact${fact}Label`)}</dt>
            <dd>{t(`about.fact${fact}Value`)}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
