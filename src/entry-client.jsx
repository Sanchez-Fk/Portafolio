import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles/index.css';

const root = document.getElementById('root');
const app = <StrictMode><App /></StrictMode>;

// En producción hay HTML prerenderizado; en `npm run dev` el contenedor está vacío
if (root.firstElementChild) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
