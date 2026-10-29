#!/usr/bin/env bash
# Checks a running proxy from the outside: status codes for good and evil requests.
#
#   proxy/selftest.sh                          # https://rss.bizibah.com/
#   BASE=http://127.0.0.1:8787/ proxy/selftest.sh
#
# Needs the internet: real feeds and httpbingo.org for nasty answers.
set -u

BASE=${BASE:-https://rss.bizibah.com/}
ORIGIN=${ORIGIN:-https://gurov.github.io}
FEED=${FEED:-https://github.com/gurov/stupid-rss-reader/commits/master.atom}
failed=0

enc() { python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"; }

# check <expected codes, e.g. 403 or 403|502> <description> <curl args...>
check() {
    local expected=$1 what=$2 code
    shift 2
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 40 "$@")
    if [[ "|$expected|" == *"|$code|"* ]]; then
        printf 'ok    %s  %s\n' "$code" "$what"
    else
        printf 'FAIL  %s  %s (expected %s)\n' "$code" "$what" "$expected"
        failed=$((failed + 1))
    fi
}

# url <expected> <feed url> [description]: a request with the right Origin
url() {
    check "$1" "${3:-$2}" -H "Origin: $ORIGIN" "${BASE}?url=$(enc "$2")"
}

echo "== feeds"
url 200 "$FEED"
url 200 "${FEED/https:/http:}" "http→https redirect"
body=$(curl -s --max-time 40 -H "Origin: $ORIGIN" "${BASE}?url=$(enc "$FEED")" | head -c 300)
if [[ $body == *"<feed"* ]]; then echo "ok    body is the Atom feed"; else echo "FAIL  body: ${body:0:80}"; failed=$((failed + 1)); fi

echo "== headers of a feed opened directly"
headers=$(curl -s -D - -o /dev/null --max-time 40 -H "Origin: $ORIGIN" "${BASE}?url=$(enc "$FEED")" | tr -d '\r')
for expected in 'content-type: text/plain' 'x-content-type-options: nosniff' \
                "content-security-policy: default-src 'none'; sandbox" \
                "access-control-allow-origin: $ORIGIN" 'vary: origin'; do
    if grep -qiF "$expected" <<<"$headers"; then echo "ok    $expected"; else echo "FAIL  no header: $expected"; failed=$((failed + 1)); fi
done
if grep -qi '^access-control-allow-credentials' <<<"$headers"; then echo "FAIL  Access-Control-Allow-Credentials is set"; failed=$((failed + 1)); fi

echo "== origin"
check 403 "no Origin" "${BASE}?url=$(enc "$FEED")"
check 403 "foreign Origin" -H "Origin: https://evil.example" "${BASE}?url=$(enc "$FEED")"
check 403 "Origin with our name inside" -H "Origin: ${ORIGIN}.evil.com" "${BASE}?url=$(enc "$FEED")"
check 403 "Origin null" -H "Origin: null" "${BASE}?url=$(enc "$FEED")"
check 204 "preflight" -X OPTIONS -H "Origin: $ORIGIN" "$BASE"

echo "== forbidden addresses"
for target in http://127.0.0.1/ http://127.1/ http://0177.0.0.1/ http://2130706433/ http://0x7f.1/ \
              http://0.0.0.0/ 'http://[::1]/' 'http://[::ffff:127.0.0.1]/' 'http://[::ffff:7f00:1]/' \
              http://169.254.169.254/metadata/v1/ http://10.0.0.1/ http://192.168.1.1/ http://localhost/ \
              http://localtest.me/ http://127.0.0.1.nip.io/ http://165.227.139.115/ https://bizibah.com/ \
              https://rss.bizibah.com/ http://bizibah.com:22/ http://example.com:8080/; do
    url 403 "$target"
done
# A redirect to a forbidden address and a slow answer are checked by the unit tests
# (test_rss_proxy.py): public test services refuse to redirect to internal addresses
# and cap delays at 10 s, below the 15 s deadline.

echo "== bad URLs"
for target in file:///etc/passwd ftp://example.com/ gopher://example.com/ 'javascript:alert(1)' \
              http://user:pass@example.com/ http:///feed; do
    url 400 "$target"
done
check 400 "no url parameter" -H "Origin: $ORIGIN" "$BASE"
check 404 "other path" -H "Origin: $ORIGIN" "${BASE}other?url=$(enc "$FEED")"
check 405 "POST" -X POST -H "Origin: $ORIGIN" "${BASE}?url=$(enc "$FEED")"

echo "== not a feed, nasty answers"
url 422 https://example.com/ "HTML page"
url 422 https://httpbingo.org/json "JSON"
url 502 https://httpbingo.org/status/500 "the site answers 500"
url 502 https://httpbingo.org/redirect/7 "too many redirects"

echo
if ((failed)); then echo "$failed check(s) failed"; exit 1; fi
echo "all checks passed"
