# Vendored files

| File | What | Version | Source | sha256 |
|---|---|---|---|---|
| `purify.es.js` | [DOMPurify](https://github.com/cure53/DOMPurify), ES module build, unchanged | 3.4.17 | `dist/purify.es.mjs` from the npm tarball `dompurify-3.4.17.tgz` (its sha512 checked against the registry) | `60c5d5ccbb466de3de3ba863461a92bf134f8c156cef7992da43e0f659bc5cbd` |

DOMPurify is under Apache-2.0 or MPL-2.0, see the header of the file.

**Update it with every security release** (watch the releases of `cure53/DOMPurify`,
for example subscribe in the reader to `https://github.com/cure53/DOMPurify/releases.atom`):

```bash
v=3.x.y
curl -sO https://registry.npmjs.org/dompurify/-/dompurify-$v.tgz
curl -s https://registry.npmjs.org/dompurify/$v | python3 -c 'import json,sys; print(json.load(sys.stdin)["dist"]["integrity"])'
echo "sha512-$(openssl dgst -sha512 -binary dompurify-$v.tgz | base64 -w0)"   # must be equal
tar -xzf dompurify-$v.tgz package/dist/purify.es.mjs
cp package/dist/purify.es.mjs docs/vendor/purify.es.js && sha256sum docs/vendor/purify.es.js
```

Then update this table, bump `APP_VERSION` in `docs/version.js` (so the service worker
fetches the new file) and run the tests in `tests/`.
