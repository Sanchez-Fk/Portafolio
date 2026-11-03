/**
 * prerender.mjs — escribe el HTML real de la página dentro de dist/index.html
 *
 * Mantiene la regla del proyecto: sin JavaScript el sitio se puede leer entero.
 * React hidrata después sobre este mismo marcado.
 */

import { readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const MARK = '<!--app-html-->';
const clientHtml = resolve('dist/index.html');
const serverEntry = pathToFileURL(resolve('dist-ssr/entry-server.js')).href;

const { render } = await import(serverEntry);
const template = await readFile(clientHtml, 'utf8');

if (!template.includes(MARK)) {
  throw new Error(`dist/index.html no contiene la marca ${MARK}`);
}

await writeFile(clientHtml, template.replace(MARK, render()));
await rm('dist-ssr', { recursive: true, force: true });

console.log('Prerender listo: dist/index.html');
