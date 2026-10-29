# RSS proxy

Browsers do not let a web page read a feed from another site (CORS), so the reader
fetches feeds through a proxy. The default one is `https://rss.bizibah.com/?url={url}`.
You can run your own and set it in the reader: **Settings → Proxy**.

**A proxy sees the addresses of all your feeds and your IP.** Use one you trust.

## The contract

Any proxy works with the reader if it does this:

- **Request:** `GET <template>`, where `{url}` in the template is replaced with the feed
  address encoded by `encodeURIComponent`. For example, the template
  `https://proxy.example/?url={url}` gives
  `https://proxy.example/?url=https%3A%2F%2Fexample.com%2Ffeed.xml`.
- **Answer:** status 200 and the bytes of the feed as is. A `charset` in
  `Content-Type` is optional: the reader also looks at `<?xml encoding="…"?>`.
- **CORS:** `Access-Control-Allow-Origin` with the origin the reader is opened from
  (`https://gurov.github.io` for the public one).
- **Errors:** any status other than 200 and a short plain text. The reader shows the
  first 200 characters of it. With `Retry-After` (and
  `Access-Control-Expose-Headers: Retry-After`) the reader tells when to retry.

Other "raw" CORS proxies fit this contract too. The reader treats whatever a proxy
returns as hostile, exactly like the feed itself.

## rss_proxy.py

One Python 3.8+ file, standard library only. What it does besides fetching:

- **Address filter (SSRF).** Only `http`/`https`, ports 80 and 443, no login in the
  URL. The name is resolved by the script, and it connects to the checked IP, not to
  the name: DNS rebinding does not pass. Loopback, private, link-local (including the
  cloud metadata `169.254.169.254`), CGNAT, multicast, reserved, documentation ranges,
  IPv6 ULA and transition ranges, and the addresses of the server itself
  (`SELF_ADDRESSES`) are refused. Every redirect (at most 5) is checked again.
- **Only feeds.** The answer is passed on only if it starts with `<rss`, `<feed` or
  `<rdf:RDF`; otherwise 422. XML is not parsed in the proxy.
- **Safe answers.** `Content-Type: text/plain`, `X-Content-Type-Options: nosniff` and
  `Content-Security-Policy: default-src 'none'; sandbox`: a feed opened directly in a
  browser cannot run a script on the proxy domain. No header of the site is passed
  on except `charset`. Client headers (cookies, `Authorization`) are not passed to the
  site.
- **Limits.** 5 MB per feed (counted while reading, also after gzip), 15 s for the
  whole request, 16 requests to sites at once, 48 connections, a token bucket per
  client IP (IPv6 by /64) and per site, a daily traffic budget. A cache in memory:
  10 minutes, 50 MB.
- **Origin.** Only the origins from `ALLOWED_ORIGINS`, exact match. Origin is not a
  protection — curl sends any — it is only for CORS.

Codes: 400 bad URL, 403 forbidden address or Origin, 404 other path, 405 other method,
422 not a feed, 429 too many requests, 502 the site failed, 503 the proxy is busy or
out of traffic, 504 the site did not answer in time.

### Settings (environment)

| Variable | Meaning |
|---|---|
| `ALLOWED_ORIGINS` | Origins of the reader, space separated. Required. |
| `RSS_PROXY_SOCKET` | Path of the unix socket to listen on (behind Caddy or nginx). |
| `RSS_PROXY_SOCKET_GROUP` | Group of the socket, the one of the web server. |
| `RSS_PROXY_LISTEN` | `host:port` to listen on TCP instead, for development. |
| `SELF_ADDRESSES` | Public addresses of your server, refused as targets. |
| `DAILY_EGRESS_BYTES` | Traffic per UTC day, 20 GiB by default. |

On a unix socket the client IP is taken from `X-Real-IP`, which the web server must
**set** (not append). On TCP it is the address of the peer.

### Running it

1. Copy `rss_proxy.py` to `/opt/rss-proxy/` (owned by root) and `rss-proxy.service` to
   `/etc/systemd/system/`. Edit the addresses and the group in the unit: see the
   comment at its top.
2. `systemctl daemon-reload && systemctl enable --now rss-proxy`, then
   `journalctl -u rss-proxy -f`.
3. Add a site to Caddy, see `Caddyfile.example`, and `systemctl reload caddy`.
4. Check it: `BASE=https://rss.example.com/ ./selftest.sh`.
5. In the reader: **Settings → Proxy**, `https://rss.example.com/?url={url}`, then
   **Check**.

The unit runs the script under a dynamic user in a sandbox, with no access to
localhost and private networks at the kernel level (`IPAddressDeny`), with memory,
task and CPU limits.

**Do not run a proxy without an address filter.** It opens your server and your
local network to anyone on the internet (SSRF).

### Development

```bash
python3 -m unittest discover -s proxy
ALLOWED_ORIGINS=http://localhost:4200 RSS_PROXY_LISTEN=127.0.0.1:8787 python3 proxy/rss_proxy.py
BASE=http://127.0.0.1:8787/ ORIGIN=http://localhost:4200 proxy/selftest.sh
```

### If the proxy is attacked

- `systemctl stop rss-proxy`: Caddy answers 502, the reader shows "the site did not
  answer", nothing else on the server is affected. Users can set another proxy.
- The log has the client key only on 429 lines (`client=…`): ban such networks in the
  firewall.
- If that does not help, remove the site from Caddy and its DNS record. This helps
  only against an attack by name: an attack on the IP hits the whole server.

## Privacy

The proxy sees the feed address and your IP. It does not store feed addresses: the
journal gets the status, the site name and the time; the access log of Caddy drops
the `url` parameter. Images in an opened post are loaded by your browser directly from
the servers of the feed authors, not through the proxy.
