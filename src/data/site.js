/**
 * site.js — datos que no se traducen
 *
 * Para añadir un proyecto: agrega un objeto a `projects` y sus claves
 * `work.<id>.type` y `work.<id>.desc` en es.json y en.json. A partir del
 * tercero, Projects.jsx activa solo el carrusel horizontal en escritorio.
 *
 * `url` es opcional: sin ella el título no es un enlace. Nunca pongas un
 * marcador provisional: en producción sería un enlace roto.
 *
 * `cover` también: sin captura, la tarjeta muestra una portada provisional
 * marcada como tal. Las capturas van a 1200 px de ancho en webp.
 */

import nodeLogo from '../assets/stack/nodedotjs.svg';
import pythonLogo from '../assets/stack/python.svg';
import reactLogo from '../assets/stack/react.svg';
import jsLogo from '../assets/stack/javascript.svg';
import electronLogo from '../assets/stack/electron.svg';
import capacitorLogo from '../assets/stack/capacitor.svg';
import gsapLogo from '../assets/stack/greensock.svg';
import htmlLogo from '../assets/stack/html5.svg';
import cssLogo from '../assets/stack/css.svg';
import gitLogo from '../assets/stack/git.svg';
import flowyCover from '../assets/projects/flowy.webp';

export const contact = {
  email: 'josemanuel.sanchez.06@gmail.com',
  phone: '+57 314 480 6854',
  phoneHref: 'tel:+573144806854',
  whatsapp: 'https://wa.me/573144806854',
  github: 'https://github.com/Sanchez-Fk',
  linkedin: 'https://www.linkedin.com/in/jos%C3%A9-manuel-sanchez-2195b0366/',
  instagram: 'https://www.instagram.com/sanchez_bk_/',
  cv: '/cv/CV-Jose-Manuel-Sanchez-Marin.pdf',
};

/* Los ids son las anclas reales de la página. */
export const sections = [
  { id: 'hero', label: 'nav.hero' },
  { id: 'sobre-mi', label: 'nav.about' },
  { id: 'proyectos', label: 'nav.work' },
  { id: 'habilidades', label: 'nav.skills' },
  { id: 'contacto', label: 'nav.contact' },
];

export const projects = [
  {
    id: 'spartan',
    title: 'Spartan',
    stack: ['React', 'Node.js', 'WebSockets', 'Electron', 'Capacitor', 'React Native'],
  },
  {
    id: 'flowy',
    title: 'Flowy',
    url: 'https://flowy-panel.vercel.app/',
    cover: flowyCover,
    stack: [],
  },
];

/* `key` = nombre de marca, igual en todos los idiomas.
   `t` = clave de traducción, para lo que sí cambia. */
export const skillGroups = [
  {
    title: 'skills.frontend',
    items: [
      { key: 'React', logo: reactLogo },
      { key: 'JavaScript (ES6+)', logo: jsLogo },
      { key: 'HTML5', logo: htmlLogo },
      { key: 'CSS3', logo: cssLogo },
      { key: 'Next.js' },
      { key: 'React Native' },
      { key: 'GSAP / ScrollTrigger', logo: gsapLogo },
      { t: 'skills.responsive' },
      { t: 'skills.a11y' },
    ],
  },
  {
    title: 'skills.backend',
    items: [
      { key: 'Node.js', logo: nodeLogo },
      { key: 'APIs REST' },
      { key: 'WebSockets' },
      { key: 'Supabase' },
      { key: 'SQLite' },
      { key: 'Python', logo: pythonLogo },
    ],
  },
  {
    title: 'skills.tools',
    items: [
      { key: 'Git / GitHub', logo: gitLogo },
      { key: 'Vite' },
      { key: 'Vitest' },
      { key: 'Electron', logo: electronLogo },
      { key: 'Capacitor', logo: capacitorLogo },
      { key: 'Figma' },
      { key: 'Spec-Driven Development' },
    ],
  },
  {
    title: 'skills.basics',
    quiet: true,
    items: [{ key: 'Angular' }, { key: 'PHP' }, { t: 'skills.ai' }],
  },
  {
    title: 'skills.learning',
    quiet: true,
    items: [{ key: 'TypeScript' }, { t: 'skills.testing' }],
  },
];
