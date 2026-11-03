import { useEffect, useState, useSyncExternalStore } from 'react';
import { contact, sections } from '../data/site.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { useMotion } from '../hooks/useMotion.js';
import { setMotionPreference } from '../lib/env.js';
import {
  introDisabled, introState, onIntroChange, setIntroDisabled, startIntro,
} from '../experience/introStore.js';

/* Sin JS no hay nada que pulsar y manda el sistema: se revela al hidratar. */
function MotionToggle() {
  const { t } = useI18n();
  const motion = useMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  if (!ready) return null;

  return (
    <button
      type="button"
      className="motion-toggle"
      aria-pressed={motion}
      aria-label={t('a11y.motionToggle')}
      data-motion-on={motion}
      onClick={() => setMotionPreference(motion ? 'off' : 'on')}
    >
      <span className="motion-toggle__dot" aria-hidden="true" />
      <span>{t('motion.label')}</span>
      <span className="motion-toggle__state">{t(motion ? 'motion.on' : 'motion.off')}</span>
    </button>
  );
}

/* "Ver intro" la repite; el interruptor la apaga para las próximas visitas. */
function IntroControls() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const off = useSyncExternalStore(onIntroChange, introDisabled, () => false);
  const playing = useSyncExternalStore(onIntroChange, () => introState() === 'playing', () => false);

  useEffect(() => setReady(true), []);
  if (!ready) return null;

  return (
    <span className="intro-controls">
      <button type="button" className="motion-toggle" disabled={playing} onClick={() => startIntro(true)}>
        {t('intro.replay')}
      </button>
      <button
        type="button"
        className="motion-toggle"
        aria-pressed={!off}
        aria-label={t('a11y.introToggle')}
        data-motion-on={!off}
        onClick={() => setIntroDisabled(!off)}
      >
        <span className="motion-toggle__dot" aria-hidden="true" />
        <span>{t('intro.label')}</span>
        <span className="motion-toggle__state">{t(off ? 'intro.off' : 'intro.on')}</span>
      </button>
    </span>
  );
}

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <p className="site-footer__brand">{t('footer.brand')}</p>

      <div className="site-footer__navs">
        {/* Sin JS el menú móvil no abre: estas anclas son su respaldo. */}
        <nav aria-label={t('a11y.navFooter')}>
          <ul className="site-footer__links">
            {sections.filter(({ id }) => id !== 'hero').map(({ id, label }) => (
              <li key={id}><a href={`#${id}`}>{t(label)}</a></li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t('a11y.navSocial')}>
          <ul className="site-footer__links">
            <li><a href={contact.github} target="_blank" rel="noopener">GitHub</a></li>
            <li><a href={contact.linkedin} target="_blank" rel="noopener">LinkedIn</a></li>
            <li><a href={contact.instagram} target="_blank" rel="noopener">Instagram</a></li>
            <li><a href={`mailto:${contact.email}`}>{t('footer.email')}</a></li>
            <li><a href={contact.phoneHref}>{contact.phone}</a></li>
          </ul>
        </nav>
      </div>

      <div className="site-footer__meta">
        <span>{t('footer.location')}</span>
        <MotionToggle />
        <IntroControls />
        <span>{t('footer.rights')}</span>
      </div>
    </footer>
  );
}
