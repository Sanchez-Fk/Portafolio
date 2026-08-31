"""
Servidor estático de desarrollo, sin caché.

`python -m http.server` no manda cabeceras de caché, así que el navegador
aplica su heurística y se queda con CSS viejo mientras editas. Esto fuerza
`no-store` para que cada recarga traiga los archivos de verdad.

Uso:  python dev-server.py [puerto]
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Silencia el log de cada asset; deja solo los errores
        if not str(args[1] if len(args) > 1 else "").startswith("2"):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    print(f"http://localhost:{port}  (sin cache)")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
