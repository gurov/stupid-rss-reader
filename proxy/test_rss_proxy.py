"""Unit tests of the proxy: python3 -m unittest discover -s proxy

Network parts are tested against a local server by calling http_get() directly with
the address given: the address filter in front of it is tested separately.
"""

import gzip
import http.client
import http.server
import ipaddress
import threading
import time
import unittest

import rss_proxy
from rss_proxy import ProxyError

RSS = b'<?xml version="1.0"?><rss version="2.0"><channel><title>t</title></channel></rss>'


class AddressFilter(unittest.TestCase):
    BLOCKED = [
        '127.0.0.1', '127.1.2.3', '0.0.0.0', '10.1.2.3', '172.16.0.1', '192.168.1.1',
        '169.254.169.254', '100.64.0.1', '192.0.2.1', '198.51.100.1', '203.0.113.1',
        '198.18.0.1', '224.0.0.1', '239.255.255.250', '240.0.0.1', '255.255.255.255',
        '::', '::1', '::127.0.0.1', '::ffff:127.0.0.1', '::ffff:8.8.8.8', '64:ff9b::7f00:1',
        '2002:7f00:1::1', '2001::1', '2001:db8::1', 'fc00::1', 'fd12:3456::1', 'fe80::1',
        'fec0::1', 'ff02::1', '100::1', '3fff::1',
    ]
    ALLOWED = ['1.1.1.1', '8.8.8.8', '140.82.121.4', '2606:4700:4700::1111', '2a00:1450:4001::1']

    def test_blocked(self):
        for address in self.BLOCKED:
            with self.subTest(address=address):
                self.assertTrue(rss_proxy.is_blocked_ip(ipaddress.ip_address(address)))

    def test_allowed(self):
        for address in self.ALLOWED:
            with self.subTest(address=address):
                self.assertFalse(rss_proxy.is_blocked_ip(ipaddress.ip_address(address)))

    def test_self_addresses(self):
        own = (ipaddress.ip_network('165.227.139.115/32'),)
        self.assertTrue(rss_proxy.is_blocked_ip(ipaddress.ip_address('165.227.139.115'), own))
        self.assertFalse(rss_proxy.is_blocked_ip(ipaddress.ip_address('165.227.139.116'), own))

    def test_literals_are_resolved_and_blocked(self):
        deadline = time.monotonic() + 5
        for host in ['127.1', '0177.0.0.1', '2130706433', '0x7f.0.0.1', '::ffff:127.0.0.1', 'localhost']:
            with self.subTest(host=host):
                with self.assertRaises(ProxyError) as caught:
                    rss_proxy.resolve_allowed(host, 80, deadline)
                self.assertEqual(caught.exception.status, 403)


class ParseTarget(unittest.TestCase):
    def test_valid(self):
        target = rss_proxy.parse_target('https://Example.COM/feed?a=1&b=2#top')
        self.assertEqual(target.url, 'https://example.com/feed?a=1&b=2')
        self.assertEqual(rss_proxy.parse_target('http://example.com:443/').url, 'http://example.com:443/')
        self.assertEqual(rss_proxy.parse_target('http://example.com').path, '/')
        self.assertEqual(rss_proxy.parse_target('http://[2606:4700::1]/x').netloc, '[2606:4700::1]')

    def test_case_of_path_is_kept(self):
        url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCxAbCdEf'
        self.assertEqual(rss_proxy.parse_target(url).url, url)

    def test_idn_and_unicode_path(self):
        target = rss_proxy.parse_target('https://пример.рф/лента?q=я')
        self.assertEqual(target.host, 'xn--e1afmkfd.xn--p1ai')
        self.assertEqual(target.path, '/%D0%BB%D0%B5%D0%BD%D1%82%D0%B0?q=%D1%8F')

    def test_errors(self):
        cases = {
            'file:///etc/passwd': 400,
            'ftp://example.com/': 400,
            'gopher://example.com/': 400,
            'javascript:alert(1)': 400,
            'http://user:pass@example.com/': 400,
            'http://user@example.com/': 400,
            'http:///feed': 400,
            'http://exa mple.com/': 400,
            'http://example.com/\n': 400,
            'http://evil.com\\@127.0.0.1/': 400,
            'http://127.0.0.1\\.evil.com/': 400,
            'http://[::1': 400,
            'http://example.com:99999/': 400,
            'http://example.com:22/': 403,
            'https://example.com:8443/': 403,
            'https://example.com/' + 'a' * 2048: 400,
        }
        for url, status in cases.items():
            with self.subTest(url=url[:60]):
                with self.assertRaises(ProxyError) as caught:
                    rss_proxy.parse_target(url)
                self.assertEqual(caught.exception.status, status)


class Sniff(unittest.TestCase):
    def test_feeds(self):
        for head in [
            RSS,
            b'\xef\xbb\xbf' + RSS,
            b'  \n<rss version="2.0">',
            b'<?xml version="1.0"?>\n<?xml-stylesheet href="x.xsl"?>\n<!-- c -->\n<feed xmlns="x">',
            b'<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY a "b">]><rss>',
            b'<!DOCTYPE rss PUBLIC "-//x//DTD RSS 0.91//EN" "http://x/rss.dtd"><rss version="0.91">',
            b'<?xml version="1.0"?><rdf:RDF xmlns:rdf="x">',
            b'<atom:feed xmlns:atom="http://www.w3.org/2005/Atom">',
            '<rss version="2.0">'.encode('utf-16'),  # Python adds the BOM itself
        ]:
            with self.subTest(head=head[:40]):
                self.assertTrue(rss_proxy.looks_like_feed(head))

    def test_not_feeds(self):
        for head in [
            b'', b'<!doctype html><html><body>rss</body></html>', b'{"items": []}',
            '<rss version="2.0">'.encode('utf-16-be'),  # UTF-16 without a BOM is not recognized
            b'<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml">',
            b'<?xml version="1.0"', b'<!-- never closed', b'<rssfoo>', b'hello <rss>',
        ]:
            with self.subTest(head=head[:40]):
                self.assertFalse(rss_proxy.looks_like_feed(head))


class Limits(unittest.TestCase):
    def test_client_key(self):
        self.assertEqual(rss_proxy.client_key('1.2.3.4'), '1.2.3.4')
        self.assertEqual(rss_proxy.client_key('2001:db8:1:2:3:4:5:6'), rss_proxy.client_key('2001:db8:1:2::ffff'))
        self.assertNotEqual(rss_proxy.client_key('2001:db8:1:2::1'), rss_proxy.client_key('2001:db8:1:3::1'))
        self.assertEqual(rss_proxy.client_key('::ffff:1.2.3.4'), '1.2.3.4')
        self.assertEqual(rss_proxy.client_key(''), 'unknown')

    def test_buckets(self):
        buckets = rss_proxy.Buckets(capacity=3, per_second=1.0, max_keys=2)
        self.assertEqual([buckets.take('a') for _ in range(3)], [0, 0, 0])
        self.assertGreater(buckets.take('a'), 0)
        self.assertEqual(buckets.take('b'), 0)
        buckets.take('c')  # the table holds two keys: 'a' is dropped
        self.assertEqual(buckets.take('a'), 0)

    def test_budget(self):
        budget = rss_proxy.DailyBudget(100)
        self.assertEqual(budget.wait(), 0)
        budget.add(100)
        self.assertGreater(budget.wait(), 0)

    def test_cache(self):
        cache = rss_proxy.Cache(max_bytes=10, ttl=60)
        cache.put('a', b'12345', '')
        cache.put('b', b'12345', 'utf-8')
        self.assertEqual(cache.get('a'), (b'12345', ''))
        cache.put('c', b'123', '')  # 'b' is the least recently used now
        self.assertIsNone(cache.get('b'))
        self.assertIsNotNone(cache.get('a'))
        cache.put('huge', b'x' * 11, '')
        self.assertIsNone(cache.get('huge'))
        expired = rss_proxy.Cache(max_bytes=10, ttl=-1)
        expired.put('a', b'1', '')
        self.assertIsNone(expired.get('a'))


class Origin(http.server.BaseHTTPRequestHandler):
    """A local "site" with feeds and nasty answers."""

    def log_message(self, format, *args):
        pass

    def _send(self, body, headers=()):
        self.send_response(200)
        for name, value in headers:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/feed':
            self._send(RSS, [('Content-Type', 'application/rss+xml; charset=windows-1251')])
        elif self.path == '/gzip':
            self._send(gzip.compress(RSS), [('Content-Encoding', 'gzip')])
        elif self.path == '/bomb':
            self._send(gzip.compress(b'\0' * (60 * 1024 * 1024)), [('Content-Encoding', 'gzip')])
        elif self.path == '/brotli':
            self._send(b'xx', [('Content-Encoding', 'br')])
        elif self.path == '/big':
            self.send_response(200)
            self.end_headers()
            chunk = b'x' * 65536
            try:
                for _ in range(200):
                    self.wfile.write(chunk)
            except OSError:
                pass
        elif self.path == '/drip':
            self.send_response(200)
            self.end_headers()
            try:
                for _ in range(100):
                    self.wfile.write(b'<')
                    self.wfile.flush()
                    time.sleep(0.2)
            except OSError:
                pass
        elif self.path == '/slow-headers':
            self.wfile.write(b'HTTP/1.0 200 OK\r\n')
            try:
                for i in range(100):
                    self.wfile.write(b'X-Slow-%d: 1\r\n' % i)
                    self.wfile.flush()
                    time.sleep(0.2)
            except OSError:
                pass
        elif self.path == '/redirect':
            self.send_response(302)
            self.send_header('Location', '/feed')
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()


class Upstream(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Origin)
        cls.server.daemon_threads = True
        cls.port = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def get(self, path, seconds=5.0):
        # Port 80/443 are the only ones parse_target() lets through, so the target
        # is built by hand here.
        target = rss_proxy.Target('http', '127.0.0.1', self.port, path)
        return rss_proxy.http_get(target, [ipaddress.ip_address('127.0.0.1')], time.monotonic() + seconds)

    def assertFails(self, path, status, seconds=5.0):
        started = time.monotonic()
        with self.assertRaises(ProxyError) as caught:
            self.get(path, seconds)
        self.assertEqual(caught.exception.status, status)
        return time.monotonic() - started

    def test_feed_and_charset(self):
        self.assertEqual(self.get('/feed'), (200, None, RSS, 'windows-1251'))

    def test_gzip_is_inflated(self):
        self.assertEqual(self.get('/gzip')[2], RSS)

    def test_zip_bomb(self):
        self.assertFails('/bomb', 502)

    def test_unknown_compression(self):
        self.assertFails('/brotli', 502)

    def test_too_large(self):
        self.assertFails('/big', 502)

    def test_drip_hits_the_deadline(self):
        self.assertLess(self.assertFails('/drip', 504, seconds=1.5), 3)

    def test_slow_headers_hit_the_deadline(self):
        self.assertLess(self.assertFails('/slow-headers', 504, seconds=1.5), 3)

    def test_redirect_is_returned(self):
        status, location, body, _ = self.get('/redirect')
        self.assertEqual((status, location, body), (302, '/feed', None))


class Redirects(unittest.TestCase):
    """Every hop is checked again: the site is public, the redirect points inside."""

    def fetch(self, location):
        saved = rss_proxy.http_get
        rss_proxy.http_get = lambda target, addresses, deadline: (302, location, None, '')
        try:
            rss_proxy.fetch_feed(rss_proxy.parse_target('https://1.1.1.1/feed'), time.monotonic() + 5)
        finally:
            rss_proxy.http_get = saved

    def test_forbidden_hops(self):
        for location in ['http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/metadata/v1/',
                         'http://localhost/', 'http://2130706433/', 'https://1.1.1.1:22/']:
            with self.subTest(location=location):
                with self.assertRaises(ProxyError) as caught:
                    self.fetch(location)
                self.assertEqual(caught.exception.status, 403)

    def test_bad_hops(self):
        for location in ['file:///etc/passwd', 'gopher://x/', 'http://user:pass@1.1.1.1/']:
            with self.subTest(location=location):
                with self.assertRaises(ProxyError) as caught:
                    self.fetch(location)
                self.assertEqual(caught.exception.status, 502)

    def test_endless_redirects(self):
        with self.assertRaises(ProxyError) as caught:
            self.fetch('/again')
        self.assertEqual((caught.exception.status, caught.exception.message), (502, 'Too many redirects'))


class Server(unittest.TestCase):
    """The request handler end to end, without going out to the internet."""

    ORIGIN = 'https://gurov.github.io'

    @classmethod
    def setUpClass(cls):
        rss_proxy.ALLOWED_ORIGINS = frozenset([cls.ORIGIN])
        cls.server = rss_proxy.TCPServer(('127.0.0.1', 0), rss_proxy.Handler)
        cls.port = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def request(self, path, origin=ORIGIN, method='GET'):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        headers = {'Origin': origin} if origin else {}
        conn.request(method, path, headers=headers)
        resp = conn.getresponse()
        body = resp.read()
        conn.close()
        return resp, body

    def test_origin(self):
        for origin in [None, 'https://evil.example', 'https://gurov.github.io.evil.com', 'null']:
            with self.subTest(origin=origin):
                resp, _ = self.request('/?url=https%3A%2F%2Fexample.com%2F', origin)
                self.assertEqual(resp.status, 403)
                self.assertIsNone(resp.getheader('Access-Control-Allow-Origin'))

    def test_errors_carry_cors_and_security_headers(self):
        resp, body = self.request('/?url=file%3A%2F%2F%2Fetc%2Fpasswd')
        self.assertEqual(resp.status, 400)
        self.assertEqual(resp.getheader('Access-Control-Allow-Origin'), self.ORIGIN)
        self.assertEqual(resp.getheader('Content-Security-Policy'), "default-src 'none'; sandbox")
        self.assertEqual(resp.getheader('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(resp.getheader('Vary'), 'Origin')
        self.assertIn(b'http', body)

    def test_local_addresses(self):
        for url in ['http%3A%2F%2F127.0.0.1%2F', 'http%3A%2F%2Flocalhost%2F', 'http%3A%2F%2F%5B%3A%3A1%5D%2F']:
            with self.subTest(url=url):
                self.assertEqual(self.request('/?url=' + url)[0].status, 403)

    def test_bad_requests(self):
        self.assertEqual(self.request('/')[0].status, 400)
        self.assertEqual(self.request('/?url=a&url=b')[0].status, 400)
        self.assertEqual(self.request('/other?url=x')[0].status, 404)
        self.assertEqual(self.request('/', method='POST')[0].status, 405)

    def test_preflight(self):
        resp, _ = self.request('/', method='OPTIONS')
        self.assertEqual(resp.status, 204)
        self.assertEqual(resp.getheader('Access-Control-Allow-Origin'), self.ORIGIN)
        self.assertEqual(self.request('/', origin='https://evil.example', method='OPTIONS')[0].status, 403)

    def test_client_limit(self):
        saved = rss_proxy.CLIENT_LIMIT
        rss_proxy.CLIENT_LIMIT = rss_proxy.Buckets(capacity=2, per_second=0.01)
        try:
            statuses = [self.request('/?url=ftp%3A%2F%2Fx%2F')[0].status for _ in range(3)]
            resp, _ = self.request('/?url=ftp%3A%2F%2Fx%2F')
        finally:
            rss_proxy.CLIENT_LIMIT = saved
        self.assertEqual(statuses, [400, 400, 429])
        self.assertEqual(resp.status, 429)
        self.assertGreater(int(resp.getheader('Retry-After')), 0)
        self.assertEqual(resp.getheader('Access-Control-Expose-Headers'), 'Retry-After')


if __name__ == '__main__':
    unittest.main()
