// Service worker: the app opens offline. Only the app files are cached, in a cache
// named after the version. Feeds and images from feeds are not touched: posts live
// in IndexedDB, and the proxy answers are not worth keeping.

importScripts('version.js');

const CACHE = `srr-app-${self.APP_VERSION}`;
const SCOPE = new URL('./', self.location).pathname;
const APP_FILES = [
    'index.html', 'app.css', 'version.js', 'manifest.json', 'favicon.ico',
    'js/app.js', 'js/db.js', 'js/dom.js', 'js/feeds.js', 'js/parser.js', 'js/post.js', 'js/sanitize.js',
    'js/views/home.js', 'js/views/feed.js', 'js/views/settings.js',
    'vendor/purify.es.js',
    'assets/fur-boot-green.svg', 'assets/android-chrome-192x192.png', 'assets/android-chrome-512x512.png',
    'assets/icon-maskable-512.png', 'assets/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        // Past the HTTP cache: GitHub Pages sends max-age=600, and the new cache
        // could otherwise get old files.
        await cache.addAll(APP_FILES.map((file) => new Request(file, { cache: 'reload' })));
        // Replacing the Angular worker of v4: take over at once, it serves a dead app.
        const active = self.registration.active;
        if (active && !active.scriptURL.endsWith('/sw.js')) {
            await self.skipWaiting();
        }
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // Every other cache goes, the ngsw:* ones of Angular included.
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'skip-waiting') {
        self.skipWaiting();
    } else if (event.data?.type === 'version') {
        event.ports[0]?.postMessage(self.APP_VERSION);
    }
});

async function fromCache(request) {
    const cache = await caches.open(CACHE);
    const url = new URL(request.url);
    // Routes live in the hash, so the page is always index.html.
    if (request.mode === 'navigate' && (url.pathname === SCOPE || url.pathname === `${SCOPE}index.html`)) {
        return (await cache.match('index.html')) || fetch(request);
    }
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) {
        return cached;
    }
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
    }
    return response;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    // gurov.github.io is shared by all GitHub Pages projects: only our path.
    if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) {
        return;
    }
    event.respondWith(fromCache(request));
});
