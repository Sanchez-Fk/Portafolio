import { Reveal, SplitHeading } from '../components/Reveal.jsx';
import { contact } from '../data/site.js';
import { useI18n } from '../hooks/useI18n.jsx';

export function Contact() {
  const { t } = useI18n();

  return (
    <section id="contacto" className="cta" aria-labelledby="cta-title">
      <SplitHeading id="cta-title" className="section__title">{t('cta.title')}</SplitHeading>

      <div className="cta__paths">
        <Reveal as="article" className="cta__path" aria-labelledby="cta-hire-title">
          <h3 id="cta-hire-title">{t('cta.hire.title')}</h3>
          <p>{t('cta.hire.desc')}</p>
          <ul className="cta__links">
            <li><a className="btn btn--primary" href={contact.cv} download data-magnetic>{t('cta.hire.cv')}</a></li>
            <li><a href={contact.linkedin} target="_blank" rel="noopener">LinkedIn</a></li>
            <li><a href={contact.github} target="_blank" rel="noopener">GitHub</a></li>
            <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
          </ul>
        </Reveal>

        <Reveal as="article" className="cta__path" aria-labelledby="cta-client-title">
          <h3 id="cta-client-title">{t('cta.client.title')}</h3>
          <p>{t('cta.client.desc')}</p>
          <ul className="cta__links">
            <li><a className="btn btn--primary" href={contact.whatsapp} target="_blank" rel="noopener" data-magnetic>{t('cta.client.whatsapp')}</a></li>
            <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
            <li><a href={contact.phoneHref}>{contact.phone}</a></li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
