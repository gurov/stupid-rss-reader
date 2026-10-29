#!/usr/bin/env python3
"""An evil proxy for the tests: answers any ?url= by the word in it.

    evil  → tests/evil-feed.xml with 200
    error → 500 with 10 KB of HTML and scripts as the error text
    huge  → 200 with 50 MB of garbage (the reader must stop at 5 MB)
    page  → 200 with an HTML page

python3 tests/evil_proxy.py  (listens on 127.0.0.1:8789)
"""

import http.server
import os
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _head(self, status, content_type, length=None):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', self.headers.get('Origin') or '*')
        if length is not None:
            self.send_header('Content-Length', str(length))
        self.end_headers()

    def do_GET(self):
        target = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('url', [''])[0]
        try:
            if 'evil' in target:
                with open(os.path.join(HERE, 'evil-feed.xml'), 'rb') as feed:
                    body = feed.read()
                self._head(200, 'text/plain; charset=utf-8', len(body))
                self.wfile.write(body)
            elif 'error' in target:
                body = ('<script>window.__pwned="error text"</script><img src=x onerror="window.__pwned=1">' * 120).encode()
                self._head(500, 'text/html', len(body))
                self.wfile.write(body)
            elif 'huge' in target:
                self._head(200, 'text/plain')  # no length: the reader must count
                chunk = b'<' * 65536
                for _ in range(800):
                    self.wfile.write(chunk)
            elif 'page' in target:
                body = b'<!doctype html><html><body><script>window.__pwned=1</script>page</body></html>'
                self._head(200, 'text/html', len(body))
                self.wfile.write(body)
            else:
                self._head(404, 'text/plain', 3)
                self.wfile.write(b'404')
        except OSError:
            pass  # the reader stopped reading


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8789), Handler).serve_forever()
