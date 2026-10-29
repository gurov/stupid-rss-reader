#!/usr/bin/env python3
"""RSS proxy for Stupid RSS Reader: GET /?url=<feed URL> returns the feed bytes as is.

Standard library only, Python 3.8+. The contract and the deployment are in README.md.

The Origin header is checked for CORS, but it is not a protection: any curl can send
it. All the security of the proxy is the address filter (SSRF) and the limits.
"""

import collections
import grp
import heapq
import http.client
import http.server
import ipaddress
import itertools
import math
import os
import re
import socket
import socketserver
import ssl
import sys
import threading
import time
import urllib.parse
import zlib
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout

MAX_URL_LENGTH = 2048
MAX_BODY = 5 * 1024 * 1024
SNIFF_BYTES = 64 * 1024
MAX_REDIRECTS = 5
DEADLINE = 15.0             # the whole upstream request, redirects included
CONNECT_TIMEOUT = 5.0
IO_TIMEOUT = 5.0            # one socket operation; the deadline is enforced by Watchdog
DNS_TIMEOUT = 5.0
CLIENT_TIMEOUT = 10.0       # reading the request from Caddy
MAX_CONNECTIONS = 48        # handler threads, below TasksMax=64 of the unit
MAX_UPSTREAM = 16           # simultaneous requests to the sites
CACHE_TTL = 600
CACHE_BYTES = 50 * 1024 * 1024

USER_AGENT = 'StupidRSSProxy/1.0 (+https://github.com/gurov/stupid-rss-reader)'
ACCEPT = ('application/rss+xml, application/atom+xml, application/rdf+xml, '
          'application/xml;q=0.9, text/xml;q=0.9, */*;q=0.1')
REDIRECT_CODES = frozenset((301, 302, 303, 307, 308))

SECURITY_HEADERS = (
    ('X-Content-Type-Options', 'nosniff'),
    # A feed opened directly in a browser must not run anything: XML served as
    # application/xml executes <script xmlns="http://www.w3.org/1999/xhtml">.
    ('Content-Security-Policy', "default-src 'none'; sandbox"),
    ('Referrer-Policy', 'no-referrer'),
)


def _env_list(name):
    return [item for item in re.split(r'[\s,]+', os.environ.get(name, '')) if item]


ALLOWED_ORIGINS = frozenset(_env_list('ALLOWED_ORIGINS'))
SELF_NETWORKS = tuple(ipaddress.ip_network(item, strict=False) for item in _env_list('SELF_ADDRESSES'))
DAILY_EGRESS_BYTES = int(os.environ.get('DAILY_EGRESS_BYTES', 20 * 1024 ** 3))


class ProxyError(Exception):
    def __init__(self, status, message, retry_after=0.0):
        super().__init__(message)
        self.status = status
        self.message = message
        self.retry_after = retry_after


# --- Address filter -------------------------------------------------------------

# An explicit list, not only ip.is_global: before the fix of CVE-2024-4032 the
# ipaddress module got some of these ranges wrong. Transition mechanisms that embed
# an IPv4 address (mapped, NAT64, 6to4, Teredo) are blocked entirely: a real feed
# never lives there, and the embedded address may be anything.
BLOCKED_NETWORKS = tuple(ipaddress.ip_network(net) for net in (
    '0.0.0.0/8',        # "this network"
    '10.0.0.0/8',       # private
    '100.64.0.0/10',    # CGNAT
    '127.0.0.0/8',      # loopback
    '169.254.0.0/16',   # link-local, cloud metadata 169.254.169.254
    '172.16.0.0/12',    # private
    '192.0.0.0/24',     # IETF protocol assignments
    '192.0.2.0/24',     # documentation
    '192.88.99.0/24',   # 6to4 relay anycast
    '192.168.0.0/16',   # private
    '198.18.0.0/15',    # benchmarking
    '198.51.100.0/24',  # documentation
    '203.0.113.0/24',   # documentation
    '224.0.0.0/4',      # multicast
    '240.0.0.0/4',      # reserved, broadcast
    '::/96',            # unspecified, loopback, IPv4-compatible
    '::ffff:0:0/96',    # IPv4-mapped
    '64:ff9b::/96',     # NAT64
    '64:ff9b:1::/48',   # local NAT64
    '100::/64',         # discard
    '2001::/23',        # IETF protocol assignments, Teredo
    '2001:db8::/32',    # documentation
    '2002::/16',        # 6to4
    '3fff::/20',        # documentation
    '5f00::/16',        # SRv6
    'fc00::/7',         # unique local
    'fe80::/10',        # link-local
    'fec0::/10',        # site-local
    'ff00::/8',         # multicast
))


def is_blocked_ip(ip, extra=()):
    if getattr(ip, 'scope_id', None):
        return True
    for net in itertools.chain(BLOCKED_NETWORKS, extra):
        if ip.version == net.version and ip in net:
            return True
    return not ip.is_global


class Target:
    __slots__ = ('scheme', 'host', 'port', 'path')

    def __init__(self, scheme, host, port, path):
        self.scheme = scheme
        self.host = host
        self.port = port
        self.path = path

    @property
    def netloc(self):
        host = '[%s]' % self.host if ':' in self.host else self.host
        default = 443 if self.scheme == 'https' else 80
        return host if self.port == default else '%s:%d' % (host, self.port)

    @property
    def url(self):
        return '%s://%s%s' % (self.scheme, self.netloc, self.path)


_PATH_SAFE = "/%:@!$&'()*+,;=-._~"
_QUERY_SAFE = _PATH_SAFE + '?'


def parse_target(raw):
    if len(raw) > MAX_URL_LENGTH:
        raise ProxyError(400, 'URL is too long')
    if re.search(r'[\x00-\x20\x7f]', raw):
        raise ProxyError(400, 'URL contains spaces or control characters')
    try:
        parts = urllib.parse.urlsplit(raw)
        port = parts.port
    except ValueError:
        raise ProxyError(400, 'Malformed URL')
    scheme = parts.scheme.lower()
    if scheme not in ('http', 'https'):
        raise ProxyError(400, 'Only http and https URLs are allowed')
    if '@' in parts.netloc:
        raise ProxyError(400, 'URL must not contain a login or password')
    host = parts.hostname or ''
    if not host.isascii():
        try:
            host = host.encode('idna').decode('ascii')
        except UnicodeError:
            raise ProxyError(400, 'Bad host name')
    if host.endswith('.'):
        host = host[:-1]
    if not host:
        raise ProxyError(400, 'URL has no host')
    if not re.fullmatch(r'[a-z0-9._:-]+', host):
        raise ProxyError(400, 'Bad host name')
    if port is None:
        port = 443 if scheme == 'https' else 80
    if port not in (80, 443):
        raise ProxyError(403, 'Only ports 80 and 443 are allowed')
    path = urllib.parse.quote(parts.path or '/', safe=_PATH_SAFE)
    if parts.query:
        path += '?' + urllib.parse.quote(parts.query, safe=_QUERY_SAFE)
    return Target(scheme, host, port, path)


_resolver = ThreadPoolExecutor(max_workers=8, thread_name_prefix='dns')


def resolve_allowed(host, port, deadline):
    """Returns the addresses of the host that we may connect to.

    The caller connects to these IPs, not to the name, so DNS rebinding between the
    check and the connection is impossible.
    """
    try:
        addresses = [ipaddress.ip_address(host)]
    except ValueError:
        timeout = min(DNS_TIMEOUT, deadline - time.monotonic())
        if timeout <= 0:
            raise ProxyError(504, 'The site did not answer in time')
        future = _resolver.submit(socket.getaddrinfo, host, port, 0, socket.SOCK_STREAM)
        try:
            infos = future.result(timeout=timeout)
        except FutureTimeout:
            raise ProxyError(504, 'DNS lookup timed out')
        except (OSError, UnicodeError):
            raise ProxyError(502, 'Could not resolve the host')
        addresses = []
        for family, _, _, _, sockaddr in infos:
            if family not in (socket.AF_INET, socket.AF_INET6):
                continue
            try:
                ip = ipaddress.ip_address(sockaddr[0].split('%', 1)[0])
            except ValueError:
                continue
            if ip not in addresses:
                addresses.append(ip)
    allowed = [ip for ip in addresses if not is_blocked_ip(ip, SELF_NETWORKS)]
    if not allowed:
        if addresses:
            raise ProxyError(403, 'This address is not allowed')
        raise ProxyError(502, 'Could not resolve the host')
    return allowed


# --- Upstream request -----------------------------------------------------------

class Watchdog:
    """Shuts down sockets that outlive their deadline. One thread for all requests.

    Socket timeouts alone are not enough: a site may send one byte a second, and
    every single read finishes in time.
    """

    def __init__(self):
        self._heap = []
        self._cond = threading.Condition()
        self._seq = itertools.count()
        self._thread = None

    def watch(self, sock, deadline):
        entry = [deadline, next(self._seq), sock, True]
        with self._cond:
            if self._thread is None:
                self._thread = threading.Thread(target=self._run, name='watchdog', daemon=True)
                self._thread.start()
            heapq.heappush(self._heap, entry)
            self._cond.notify()
        return entry

    def cancel(self, entry):
        with self._cond:
            entry[3] = False

    def _run(self):
        with self._cond:
            while True:
                while self._heap and not self._heap[0][3]:
                    heapq.heappop(self._heap)
                if not self._heap:
                    self._cond.wait()
                    continue
                delay = self._heap[0][0] - time.monotonic()
                if delay > 0:
                    self._cond.wait(delay)
                    continue
                entry = heapq.heappop(self._heap)
                entry[3] = False
                try:
                    # The base method: SSLSocket.shutdown is not safe while another
                    # thread reads from the socket.
                    socket.socket.shutdown(entry[2], socket.SHUT_RDWR)
                except OSError:
                    pass


WATCHDOG = Watchdog()
TLS_CONTEXT = ssl.create_default_context()
TLS_CONTEXT.minimum_version = ssl.TLSVersion.TLSv1_2


class _SocketConnection(http.client.HTTPConnection):
    """HTTPConnection over a socket we have already connected to a checked IP."""

    def __init__(self, sock):
        super().__init__('unused')
        self.sock = sock

    def connect(self):
        raise http.client.HTTPException('the socket is already connected')


def open_socket(target, addresses, deadline):
    error = None
    for ip in addresses[:3]:
        timeout = min(CONNECT_TIMEOUT, deadline - time.monotonic())
        if timeout <= 0:
            break
        try:
            raw = socket.create_connection((str(ip), target.port), timeout=timeout)
        except OSError as exc:
            error = exc
            continue
        if target.scheme == 'https':
            sock = TLS_CONTEXT.wrap_socket(raw, server_hostname=target.host,
                                           do_handshake_on_connect=False)
        else:
            sock = raw
        entry = WATCHDOG.watch(sock, deadline)
        sock.settimeout(IO_TIMEOUT)
        return sock, entry
    if time.monotonic() >= deadline or isinstance(error, socket.timeout):
        raise ProxyError(504, 'The site did not answer in time')
    raise ProxyError(502, 'Could not connect to the site')


def parse_charset(content_type):
    match = re.search(r'charset\s*=\s*"?([A-Za-z0-9._:-]{1,40})', content_type or '', re.I)
    return match.group(1) if match else ''


TOO_LARGE = 'The feed is larger than %d MB' % (MAX_BODY // (1024 * 1024))


def _inflate(decoder, data, room):
    out = []
    while True:
        piece = decoder.decompress(data, room + 1)
        room -= len(piece)
        if room < 0:
            raise ProxyError(502, TOO_LARGE)
        out.append(piece)
        data = decoder.unconsumed_tail
        if not data:
            return b''.join(out)


def read_body(resp, deadline):
    """Reads at most MAX_BODY bytes, counting the real bytes, not Content-Length."""
    encoding = (resp.getheader('Content-Encoding') or '').strip().lower()
    if encoding in ('', 'identity'):
        decoder = None
        length = resp.getheader('Content-Length') or ''
        if length.isdigit() and int(length) > MAX_BODY:
            raise ProxyError(502, TOO_LARGE)
    elif encoding in ('gzip', 'x-gzip', 'deflate'):
        # The site ignored Accept-Encoding: identity. Inflate with the same limit,
        # so a zip bomb cannot eat the memory.
        decoder = zlib.decompressobj(32 + zlib.MAX_WBITS)
    else:
        raise ProxyError(502, 'Unsupported compression: %s' % encoding[:20])
    chunks = []
    total = 0
    while True:
        if time.monotonic() >= deadline:
            raise ProxyError(504, 'The site did not answer in time')
        data = resp.read1(65536)
        if not data:
            break
        if decoder is not None:
            try:
                data = _inflate(decoder, data, MAX_BODY - total)
            except zlib.error:
                raise ProxyError(502, 'Bad compressed data')
        total += len(data)
        if total > MAX_BODY:
            raise ProxyError(502, TOO_LARGE)
        chunks.append(data)
    # The watchdog shuts the socket down at the deadline, and the read sees it as
    # the normal end of the body.
    if time.monotonic() >= deadline:
        raise ProxyError(504, 'The site did not answer in time')
    return b''.join(chunks)


def http_get(target, addresses, deadline):
    """One request without following redirects: (status, location, body, charset)."""
    sock, entry = open_socket(target, addresses, deadline)
    resp = None
    try:
        if target.scheme == 'https':
            sock.do_handshake()
        conn = _SocketConnection(sock)
        conn.putrequest('GET', target.path, skip_host=True, skip_accept_encoding=True)
        conn.putheader('Host', target.netloc)
        conn.putheader('User-Agent', USER_AGENT)
        conn.putheader('Accept', ACCEPT)
        conn.putheader('Accept-Encoding', 'identity')
        conn.putheader('Connection', 'close')
        conn.endheaders()
        resp = conn.getresponse()
        if resp.status != 200:
            return resp.status, resp.getheader('Location'), None, ''
        charset = parse_charset(resp.getheader('Content-Type'))
        return 200, None, read_body(resp, deadline), charset
    except ProxyError:
        raise
    except ssl.SSLCertVerificationError:
        raise ProxyError(502, 'The site has a bad TLS certificate')
    except (OSError, http.client.HTTPException, ValueError):
        if time.monotonic() >= deadline:
            raise ProxyError(504, 'The site did not answer in time')
        raise ProxyError(502, 'The site broke the connection')
    finally:
        WATCHDOG.cancel(entry)
        if resp is not None:
            resp.close()
        sock.close()


_FEED_ROOT = re.compile(rb'<(?:[A-Za-z_][\w.-]*:)?(?:rss|feed|RDF)[\s>/]')


def looks_like_feed(head):
    """True if the document starts with <rss, <feed or <rdf:RDF.

    Only the beginning is looked at: parsing XML here would open the proxy to
    billion laughs and quadratic blowup.
    """
    data = head
    if data.startswith(b'\xef\xbb\xbf'):
        data = data[3:]
    elif data[:2] in (b'\xff\xfe', b'\xfe\xff'):
        data = data.decode('utf-16', 'ignore').lstrip('﻿').encode('utf-8')
    pos = 0
    size = len(data)
    while pos < size:
        if data[pos:pos + 1].isspace():
            pos += 1
        elif data.startswith(b'<?', pos):
            end = data.find(b'?>', pos + 2)
            if end < 0:
                return False
            pos = end + 2
        elif data.startswith(b'<!--', pos):
            end = data.find(b'-->', pos + 4)
            if end < 0:
                return False
            pos = end + 3
        elif data[pos:pos + 9].upper() == b'<!DOCTYPE':
            end = data.find(b'>', pos)
            bracket = data.find(b'[', pos, end if end >= 0 else size)
            if bracket >= 0:
                close = data.find(b']', bracket)
                end = data.find(b'>', close) if close >= 0 else -1
            if end < 0:
                return False
            pos = end + 1
        else:
            break
    return _FEED_ROOT.match(data, pos) is not None


def fetch_feed(target, deadline):
    for _ in range(MAX_REDIRECTS + 1):
        addresses = resolve_allowed(target.host, target.port, deadline)
        status, location, body, charset = http_get(target, addresses, deadline)
        if status == 200:
            if not looks_like_feed(body[:SNIFF_BYTES]):
                raise ProxyError(422, 'This is not an RSS or Atom feed')
            return body, charset
        if status not in REDIRECT_CODES:
            raise ProxyError(502, 'The site answered %d' % status)
        if not location:
            raise ProxyError(502, 'Redirect without a Location header')
        try:
            target = parse_target(urllib.parse.urljoin(target.url, location.strip()))
        except ProxyError as error:
            if error.status == 403:
                raise
            raise ProxyError(502, 'Bad redirect')
    raise ProxyError(502, 'Too many redirects')


# --- Limits and cache -----------------------------------------------------------

class Buckets:
    """Token buckets by key. The table is bounded: the oldest keys are dropped."""

    def __init__(self, capacity, per_second, max_keys=50000):
        self.capacity = capacity
        self.rate = per_second
        self.max_keys = max_keys
        self._items = collections.OrderedDict()
        self._lock = threading.Lock()

    def take(self, key):
        """Takes a token: 0 when allowed, otherwise seconds to wait."""
        now = time.monotonic()
        with self._lock:
            tokens, stamp = self._items.pop(key, (self.capacity, now))
            tokens = min(self.capacity, tokens + (now - stamp) * self.rate)
            if tokens >= 1:
                tokens -= 1
                wait = 0.0
            else:
                wait = (1 - tokens) / self.rate
            self._items[key] = (tokens, now)
            if len(self._items) > self.max_keys:
                self._items.popitem(last=False)
            return wait


class DailyBudget:
    """Bytes sent per UTC day. Traffic above the droplet quota costs money."""

    def __init__(self, limit):
        self.limit = limit
        self._day = None
        self._used = 0
        self._lock = threading.Lock()

    def _roll(self, now):
        day = int(now // 86400)
        if day != self._day:
            self._day = day
            self._used = 0

    def wait(self):
        now = time.time()
        with self._lock:
            self._roll(now)
            if self._used < self.limit:
                return 0.0
            return 86400 - now % 86400

    def add(self, size):
        with self._lock:
            self._roll(time.time())
            self._used += size


class Cache:
    """Successful responses by URL, in memory, bounded by total size."""

    def __init__(self, max_bytes, ttl):
        self.max_bytes = max_bytes
        self.ttl = ttl
        self._items = collections.OrderedDict()
        self._bytes = 0
        self._lock = threading.Lock()

    def get(self, key):
        now = time.monotonic()
        with self._lock:
            item = self._items.get(key)
            if item is None:
                return None
            if item[0] < now:
                del self._items[key]
                self._bytes -= len(item[1])
                return None
            self._items.move_to_end(key)
            return item[1], item[2]

    def put(self, key, body, charset):
        if len(body) > self.max_bytes:
            return
        with self._lock:
            old = self._items.pop(key, None)
            if old is not None:
                self._bytes -= len(old[1])
            self._items[key] = (time.monotonic() + self.ttl, body, charset)
            self._bytes += len(body)
            while self._bytes > self.max_bytes:
                _, item = self._items.popitem(last=False)
                self._bytes -= len(item[1])


def client_key(address):
    """The rate limit key: the IPv4 address or the /64 of an IPv6 one."""
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return 'unknown'
    if ip.version == 6:
        if ip.ipv4_mapped:
            return str(ip.ipv4_mapped)
        return str(ipaddress.ip_network('%s/64' % ip, strict=False))
    return str(ip)


# Enough for "refresh all" of ~100 feeds at once, then one request a second.
CLIENT_LIMIT = Buckets(capacity=120, per_second=1.0)
# Cache misses per site, so the proxy cannot be used to flood someone else's site.
HOST_LIMIT = Buckets(capacity=30, per_second=0.5)
# Cache misses for the whole process.
GLOBAL_LIMIT = Buckets(capacity=120, per_second=5.0, max_keys=1)
EGRESS = DailyBudget(DAILY_EGRESS_BYTES)
CACHE = Cache(CACHE_BYTES, CACHE_TTL)
UPSTREAM = threading.BoundedSemaphore(MAX_UPSTREAM)
CONNECTIONS = threading.BoundedSemaphore(MAX_CONNECTIONS)


# --- HTTP server ----------------------------------------------------------------

def log(status, host, started, note=''):
    took = int((time.monotonic() - started) * 1000)
    print(('%d %s %dms %s' % (status, host, took, note)).rstrip(), file=sys.stderr, flush=True)


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = 'rss-proxy'
    sys_version = ''
    protocol_version = 'HTTP/1.0'
    timeout = CLIENT_TIMEOUT

    def log_message(self, format, *args):
        pass  # one line per request is written by log()

    def _begin(self):
        self._started = time.monotonic()
        self._host = '-'
        self._note = ''
        self._origin = self.headers.get('Origin', '')
        self._origin_ok = self._origin in ALLOWED_ORIGINS

    def _client_ip(self):
        if isinstance(self.client_address, tuple):
            return self.client_address[0]
        # Unix socket: only Caddy can connect, and it sets X-Real-IP itself.
        return self.headers.get('X-Real-IP', '')

    def _finish(self, status, body, content_type, cache_control, retry_after=0.0, extra=()):
        try:
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', cache_control)
            for name, value in SECURITY_HEADERS:
                self.send_header(name, value)
            self.send_header('Vary', 'Origin')
            if self._origin_ok:
                self.send_header('Access-Control-Allow-Origin', self._origin)
                self.send_header('Access-Control-Expose-Headers', 'Retry-After')
            if retry_after:
                self.send_header('Retry-After', str(max(1, math.ceil(retry_after))))
            for name, value in extra:
                self.send_header(name, value)
            self.end_headers()
            self.wfile.write(body)
        except OSError:
            pass  # the client has gone
        log(status, self._host, self._started, self._note)

    def _error(self, error):
        self._finish(error.status, (error.message + '\n').encode('utf-8'),
                     'text/plain; charset=utf-8', 'no-store', error.retry_after)

    def do_GET(self):
        self._begin()
        try:
            self._get()
        except ProxyError as error:
            self._error(error)
        except Exception as exc:  # never show internals to the client
            self._note = 'internal %s' % type(exc).__name__
            self._error(ProxyError(500, 'Internal error'))

    def _get(self):
        path, _, query = self.path.partition('?')
        if path != '/':
            raise ProxyError(404, 'Not found')
        if not self._origin_ok:
            raise ProxyError(403, 'This Origin is not allowed')
        # Cheap refusals first: before parsing the URL, DNS and the cache.
        client = client_key(self._client_ip())
        wait = CLIENT_LIMIT.take(client)
        if wait:
            self._note = 'client=%s' % client
            raise ProxyError(429, 'Too many requests, try again later', wait)
        wait = EGRESS.wait()
        if wait:
            raise ProxyError(503, 'The proxy has used up its traffic for today', wait)
        try:
            values = urllib.parse.parse_qs(query, keep_blank_values=True,
                                           max_num_fields=4).get('url', [])
        except ValueError:
            raise ProxyError(400, 'Bad query')
        if len(values) != 1:
            raise ProxyError(400, 'Pass exactly one url parameter')
        target = parse_target(values[0])
        self._host = target.host
        cached = CACHE.get(target.url)
        if cached is not None:
            self._note = 'cache'
            self._send_feed(*cached)
            return
        wait = GLOBAL_LIMIT.take('all')
        if wait:
            raise ProxyError(503, 'The proxy is busy, try again later', wait)
        wait = HOST_LIMIT.take(target.host)
        if wait:
            raise ProxyError(429, 'Too many requests to this site, try again later', wait)
        if not UPSTREAM.acquire(blocking=False):
            raise ProxyError(503, 'The proxy is busy, try again later', 5)
        try:
            body, charset = fetch_feed(target, time.monotonic() + DEADLINE)
        finally:
            UPSTREAM.release()
        CACHE.put(target.url, body, charset)
        self._send_feed(body, charset)

    def _send_feed(self, body, charset):
        content_type = 'text/plain; charset=%s' % charset if charset else 'text/plain'
        EGRESS.add(len(body))
        self._finish(200, body, content_type, 'public, max-age=300')

    def do_OPTIONS(self):
        self._begin()
        if not self._origin_ok:
            self._error(ProxyError(403, 'This Origin is not allowed'))
            return
        self._finish(204, b'', 'text/plain', 'no-store', extra=(
            ('Access-Control-Allow-Methods', 'GET'),
            ('Access-Control-Max-Age', '86400'),
        ))

    def _not_allowed(self):
        self._begin()
        self._finish(405, b'Method not allowed\n', 'text/plain; charset=utf-8', 'no-store',
                     extra=(('Allow', 'GET, OPTIONS'),))

    do_HEAD = do_POST = do_PUT = do_PATCH = do_DELETE = _not_allowed


BUSY_RESPONSE = (b'HTTP/1.0 503 Service Unavailable\r\n'
                 b'Content-Type: text/plain; charset=utf-8\r\n'
                 b'Content-Length: 35\r\n'
                 b'Retry-After: 5\r\n'
                 b'Connection: close\r\n\r\n'
                 b'The proxy is busy, try again later\n')


class _LimitedThreads:
    """At most MAX_CONNECTIONS handler threads; the rest get 503 at once."""

    daemon_threads = True
    block_on_close = False

    def process_request(self, request, client_address):
        if not CONNECTIONS.acquire(blocking=False):
            try:
                request.sendall(BUSY_RESPONSE)
            except OSError:
                pass
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except Exception:
            CONNECTIONS.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            CONNECTIONS.release()


class UnixServer(_LimitedThreads, socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    def server_bind(self):
        try:
            os.unlink(self.server_address)
        except FileNotFoundError:
            pass
        super().server_bind()
        os.chmod(self.server_address, 0o660)
        group = os.environ.get('RSS_PROXY_SOCKET_GROUP')
        if group:
            os.chown(self.server_address, -1, grp.getgrnam(group).gr_gid)


class TCPServer(_LimitedThreads, socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True


def main():
    if not ALLOWED_ORIGINS:
        sys.exit('ALLOWED_ORIGINS is empty: set it to the origins the reader is opened from')
    socket_path = os.environ.get('RSS_PROXY_SOCKET')
    listen = os.environ.get('RSS_PROXY_LISTEN')
    if socket_path:
        server = UnixServer(socket_path, Handler)
    elif listen:
        host, _, port = listen.rpartition(':')
        server = TCPServer((host or '127.0.0.1', int(port)), Handler)
    else:
        sys.exit('Set RSS_PROXY_SOCKET (a unix socket for Caddy) or RSS_PROXY_LISTEN (host:port)')
    print('rss-proxy listening on %s' % (socket_path or listen), file=sys.stderr, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
