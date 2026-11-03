/**
 * Projects — tarjetas de proyecto
 *
 * Con tres proyectos o más, en escritorio con ratón, la sección se fija y el
 * scroll vertical mueve las tarjetas a lo ancho. En táctil no: secuestrar ese
 * scroll es mala idea, aunque la pantalla mida más de 1024px.
 */

import { useEffect, useRef } from 'react';
import { Reveal, SplitHeading } from '../components/Reveal.jsx';
import { projects } from '../data/site.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { useMotion } from '../hooks/useMotion.js';
import { gsap } from '../lib/gsap.js';

const CAROUSEL_FROM = 3;

function ProjectCard({ project, tag: Tag = 'li' }) {
  const { t } = useI18n();
  const { id, title, url, stack, cover } = project;

  return (
    <Tag className="project">
      <div className="project__cover" aria-hidden="true">
        {cover ? (
          <img src={cover} alt="" width="1200" height="750" loading="lazy" decoding="async" />
        ) : (
          <>
            <span className="project__cover-title">{title}</span>
            <span className="project__cover-note">{t('work.previewNote')}</span>
          </>
        )}
      </div>

      <p className="project__type">{t(`work.${id}.type`)}</p>
      <h3 className="project__title">
        {url ? (
          <a href={url} target="_blank" rel="noopener" aria-label={`${title}, ${t('a11y.newTab')}`}>{title}</a>
        ) : title}
      </h3>
      <p className="project__desc">{t(`work.${id}.desc`)}</p>

      {stack.length > 0 && (
        <ul className="project__stack" aria-label={t('a11y.techList')}>
          {stack.map((tech) => <li key={tech}>{tech}</li>)}
        </ul>
      )}
    </Tag>
  );
}

export function Projects() {
  const { t } = useI18n();
  const motion = useMotion();
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const useCarousel = projects.length >= CAROUSEL_FROM;

  useEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!useCarousel || !motion || !section || !viewport || !track) return undefined;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 1024px) and (hover: hover) and (pointer: fine)', () => {
      section.classList.add('is-horizontal');

      const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          // 1px de scroll = 1px lateral
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      return () => section.classList.remove('is-horizontal');
    });

    return () => mm.revert();
  }, [motion, useCarousel]);

  return (
    <section ref={sectionRef} id="proyectos" className="work" aria-labelledby="work-title">
      <SplitHeading id="work-title" className="section__title">{t('work.title')}</SplitHeading>

      <div ref={viewportRef} className="work__viewport">
        <ol ref={trackRef} className="work__list">
          {projects.map((project) => (
            useCarousel
              ? <ProjectCard key={project.id} project={project} />
              : (
                <Reveal as="li" key={project.id} className="work__item">
                  <ProjectCard project={project} tag="article" />
                </Reveal>
              )
          ))}
        </ol>
      </div>
    </section>
  );
}
