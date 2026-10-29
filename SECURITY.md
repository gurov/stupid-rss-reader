# Security

Please report vulnerabilities privately: **Security → Report a vulnerability** on the
GitHub page of the repository. Do not open a public issue for a hole in the proxy: it
is open to the internet, and anyone could use the hole before it is fixed.

In scope:

- **The reader** (`docs/`): script execution or HTML injection through a feed or a
  proxy answer, links or images that bypass the address checks, a way around the
  Content Security Policy or Trusted Types, leaks of the data in IndexedDB.
- **The proxy** (`proxy/rss_proxy.py`, `rss.bizibah.com`): requests to local, private
  or cloud metadata addresses (SSRF), ways around its limits, using it to attack other
  sites, a feed that runs a script on the proxy domain.

Not a vulnerability: what any proxy sees by design (the addresses of the feeds you
refresh and your IP), and images in an opened post loading from the sites of the feed
authors.
