import { useEffect } from 'react';
import { IntroLayer } from './experience/IntroLayer.jsx';
import { JourneyRail } from './components/JourneyRail.jsx';
import { SiteHeader } from './components/SiteHeader.jsx';
import { I18nProvider, useI18n } from './hooks/useI18n.jsx';
import { initMagnetic } from './lib/magnetic.js';
import { About } from './sections/About.jsx';
import { Contact } from './sections/Contact.jsx';
import { Hero } from './sections/Hero.jsx';
import { Projects } from './sections/Projects.jsx';
import { Skills } from './sections/Skills.jsx';
import { SiteFooter } from './sections/SiteFooter.jsx';

function Page() {
  const { t } = useI18n();

  useEffect(() => initMagnetic(), []);

  return (
    <>
      <a className="skip-link" href="#contenido">{t('a11y.skip')}</a>
      <SiteHeader />
      <JourneyRail />
      <main id="contenido">
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <SiteFooter />
      <IntroLayer />
    </>
  );
}

export function App() {
  return (
    <I18nProvider>
      <Page />
    </I18nProvider>
  );
}
