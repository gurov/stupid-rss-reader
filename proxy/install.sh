#!/usr/bin/env bash
# Installs or updates the proxy on a server over ssh: rss_proxy.py goes to
# /opt/rss-proxy/, rss-proxy.service to /etc/systemd/system/, the service is
# (re)started and asked for a feed and for 127.0.0.1 through its socket.
#
#   SERVER=root@bizibah.com proxy/install.sh
#
# Edit rss-proxy.service for your server first, see the comment at its top. The web
# server in front is set up separately (Caddyfile.example).
set -euo pipefail

SERVER=${SERVER:?set SERVER, for example root@bizibah.com}
ORIGIN=${ORIGIN:-https://gurov.github.io}
HERE=$(cd "$(dirname "$0")" && pwd)

echo "==> Copying"
ssh "$SERVER" 'install -d -o root -g root -m 755 /opt/rss-proxy'
scp -q "$HERE/rss_proxy.py" "$SERVER:/opt/rss-proxy/rss_proxy.py.new"
scp -q "$HERE/rss-proxy.service" "$SERVER:/etc/systemd/system/rss-proxy.service.new"

echo "==> Checking and (re)starting"
ssh "$SERVER" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/rss-proxy
python3 -I -c 'import ast; ast.parse(open("rss_proxy.py.new").read())'
install -o root -g root -m 644 rss_proxy.py.new rss_proxy.py
rm rss_proxy.py.new
unit=/etc/systemd/system/rss-proxy.service
install -o root -g root -m 644 "$unit.new" "$unit"
rm "$unit.new"
# The access log of Caddyfile.example, created ahead so that it belongs to Caddy.
if id caddy >/dev/null 2>&1 && [ -d /var/log/caddy ] && [ ! -e /var/log/caddy/rss-access.log ]; then
    install -o caddy -g caddy -m 600 /dev/null /var/log/caddy/rss-access.log
fi
systemctl daemon-reload
systemctl enable --quiet rss-proxy
systemctl restart rss-proxy
sleep 1
echo "    $(systemctl is-active rss-proxy), $(sha256sum rss_proxy.py | cut -c1-16)…"
journalctl -u rss-proxy -n 3 --no-pager -o cat | sed 's/^/    /'
REMOTE

echo "==> Requests through the socket"
ssh "$SERVER" "ORIGIN='$ORIGIN' bash -s" <<'REMOTE'
ask() {
    curl -s -o /dev/null -w "    %{http_code}  $2 (expected $3)\n" --max-time 30 \
        --unix-socket /run/rss-proxy/rss-proxy.sock -H "Origin: $ORIGIN" -H 'X-Real-IP: 127.0.0.1' \
        "http://localhost/?url=$1"
}
ask 'https%3A%2F%2Fgithub.com%2Fgurov%2Fstupid-rss-reader%2Fcommits%2Fmaster.atom' 'a feed' 200
ask 'http%3A%2F%2F127.0.0.1%3A2019%2Fconfig%2F' 'Caddy admin on 127.0.0.1' 403
ask 'http%3A%2F%2F169.254.169.254%2Fmetadata%2Fv1%2F' 'cloud metadata' 403
REMOTE
echo "Done. From outside: BASE=https://<your proxy>/ proxy/selftest.sh"
