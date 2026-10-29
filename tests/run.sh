#!/usr/bin/env bash
# Runs the browser tests in headless Chrome, twice: tests/index.html (with the CSP
# and Trusted Types of the app) and tests/no-csp.html (sanitizing alone), with the
# evil proxy (tests/evil_proxy.py) running. Needs Python 3, Node 22+ and Chrome.
# Exit code 1 if anything failed. By hand: serve the repository and open /tests/.
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-4201}

python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
server=$!
python3 tests/evil_proxy.py >/dev/null 2>&1 &
evil=$!
trap 'kill $server $evil' EXIT
sleep 1

node tests/run.mjs "http://127.0.0.1:$PORT/tests/index.html" "http://127.0.0.1:$PORT/tests/no-csp.html"
