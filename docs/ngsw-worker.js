// The Angular service worker of v4 lived here. A browser that still has it fetches
// this file to update it, gets this one instead, and the old worker is gone: its
// caches are removed, the registration is dropped and open pages reload into the new
// app, which registers sw.js. (ngsw.json is deleted too: on its 404 the Angular
// worker removes itself as well.) Delete this file when nobody can have v4 anymore.

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('ngsw:')).map((key) => caches.delete(key)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: 'window' });
        await Promise.all(clients.map((client) => client.navigate(client.url).catch(() => null)));
    })());
});
