// The entry point: routes, banners, the service worker.

import { onDbEvent, openDb } from './db.js';
import { h, icon, setNetworkButtons } from './dom.js';
import * as home from './views/home.js';
import * as feed from './views/feed.js';
import * as settings from './views/settings.js';

const main = document.getElementById('app');
const banners = document.getElementById('banners');
let current = null;

// Development aid: Content Security Policy violations go to the console. Styles in
// feed HTML are refused inside the inert documents of DOMParser while sanitizing:
// that is expected and not reported.
document.addEventListener('securitypolicyviolation', (event) => {
    const sanitizing = /\/(sanitize|purify\.es)\.js$/.test(event.sourceFile || '');
    if (!(sanitizing && event.effectiveDirective.startsWith('style-src'))) {
        console.warn('CSP:', event.effectiveDirective, event.blockedURI || '(inline)', event.sourceFile || '');
    }
});

// --- Routes: #/ , #/<id> , #/settings (the same hashes as the Angular version) ---

function route() {
    const path = location.hash.replace(/^#\/?/, '');
    current?.destroy();
    if (path === 'settings') {
        current = settings.render();
    } else if (/^\d+$/.test(path)) {
        current = feed.render(Number(path));
    } else {
        current = home.render();
    }
    document.title = current.title;
    main.replaceChildren(current.el);
    window.scrollTo(0, 0);
}

// --- Banners --------------------------------------------------------------------

function banner(id, ...content) {
    document.getElementById(id)?.remove();
    const el = h('div', { class: 'banner', id }, ...content);
    banners.append(el);
    return el;
}

function hideBanner(id) {
    document.getElementById(id)?.remove();
}

function networkChanged() {
    if (navigator.onLine) {
        hideBanner('banner-offline');
    } else {
        banner('banner-offline', icon('alert'), 'Offline: you see the saved posts.');
    }
    setNetworkButtons();
}

onDbEvent((type) => {
    if (type === 'blocked') {
        banner('banner-db', icon('alert'), 'Close the other tabs of Stupid RSS Reader to finish the update.');
    } else if (type === 'open') {
        hideBanner('banner-db');
    } else if (type === 'closed') {
        banner('banner-db', icon('alert'), 'The app was updated in another tab. ',
            h('button', { type: 'button', class: 'button', onclick: () => location.reload() }, 'Reload'));
    }
});

// --- Service worker -------------------------------------------------------------

// register() takes a TrustedScriptURL under Trusted Types: only our sw.js passes.
const workerPolicy = globalThis.trustedTypes?.createPolicy('srr-sw', {
    createScriptURL: (url) => {
        if (url !== 'sw.js') {
            throw new TypeError(`Unexpected worker: ${url}`);
        }
        return url;
    },
});

// The page reloads only when the user asked for it. (The worker that replaces the
// Angular one takes over by itself, but this page is already the new app.)
let reloadOnChange = false;

function offerUpdate(worker) {
    banner('banner-update', 'A new version is ready. ',
        h('button', {
            type: 'button', class: 'button primary', onclick: () => {
                reloadOnChange = true;
                worker.postMessage({ type: 'skip-waiting' });
            },
        }, 'Reload'));
}

async function registerWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadOnChange) {
            reloadOnChange = false;
            location.reload();
        }
    });
    const script = workerPolicy ? workerPolicy.createScriptURL('sw.js') : 'sw.js';
    const registration = await navigator.serviceWorker.register(script, { scope: './', updateViaCache: 'none' });
    const watch = (worker) => {
        worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                offerUpdate(worker);
            }
        });
    };
    if (registration.waiting && navigator.serviceWorker.controller) {
        offerUpdate(registration.waiting);
    }
    watch(registration.installing);
    registration.addEventListener('updatefound', () => watch(registration.installing));
}

// --- Start ----------------------------------------------------------------------

window.addEventListener('hashchange', route);
window.addEventListener('online', networkChanged);
window.addEventListener('offline', networkChanged);

openDb()
    .then(() => {
        route();
        networkChanged();
    })
    .catch((error) => {
        main.replaceChildren(h('div', { class: 'card' },
            h('h1', null, 'Could not open the database'),
            h('p', null, 'The reader keeps its data in IndexedDB, and the browser refused it: ', String(error?.message || error)),
            h('p', null, 'In a private window some browsers do not allow it.')));
    });

registerWorker().catch((error) => console.warn('Service worker:', error));
