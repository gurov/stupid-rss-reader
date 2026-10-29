// #/settings — the proxy, the cache of the app, the data.

import * as db from '../db.js';
import { h, icon, spinner, plural, replace, setNetworkButtons } from '../dom.js';
import { CHECK_FEED, DEFAULT_PROXY, FetchError, checkProxyTemplate, errorText, fetchFeed, getProxy } from '../feeds.js';

const PROXY_README = 'https://github.com/gurov/stupid-rss-reader/blob/master/proxy/README.md';

async function serviceWorkerVersion() {
    const registration = await navigator.serviceWorker?.getRegistration();
    const worker = registration?.active;
    if (!worker) {
        return 'not installed';
    }
    if (!worker.scriptURL.endsWith('/sw.js')) {
        return 'an old one, reload the page';
    }
    return new Promise((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve('active'), 1000);
        channel.port1.onmessage = (event) => {
            clearTimeout(timer);
            resolve(typeof event.data === 'string' ? event.data.slice(0, 40) : 'active');
        };
        worker.postMessage({ type: 'version' }, [channel.port2]);
    });
}

async function resetCache() {
    if (!confirm('Remove the cached app files and the service worker? Your feeds and posts stay. The page will reload.')) {
        return;
    }
    const registrations = await navigator.serviceWorker?.getRegistrations() || [];
    await Promise.all(registrations.map((registration) => registration.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    location.reload();
}

async function deleteData() {
    if (!confirm('Delete all feeds, posts and settings from this browser? This cannot be undone.')) {
        return;
    }
    await db.deleteDatabase();
    location.hash = '#/';
    location.reload();
}

export function render() {
    const input = h('input', {
        id: 'proxy', type: 'url', inputmode: 'url', autocomplete: 'off', autocapitalize: 'off',
        spellcheck: 'false', maxlength: 600, 'aria-describedby': 'proxy-hint proxy-status',
    });
    const proxyStatus = h('p', { id: 'proxy-status', class: 'form-status', 'aria-live': 'polite' });
    const swVersion = h('span', null, '…');

    function say(...content) {
        replace(proxyStatus, ...content);
    }

    async function save(event) {
        event.preventDefault();
        const { template, error } = checkProxyTemplate(input.value);
        if (error) {
            say(icon('alert'), error);
            return;
        }
        input.value = template;
        if (template === DEFAULT_PROXY) {
            await db.deleteSetting('proxy');
        } else {
            await db.setSetting('proxy', template);
        }
        say(icon('check'), 'Saved.');
    }

    async function check() {
        const { template, error } = checkProxyTemplate(input.value);
        if (error) {
            say(icon('alert'), error);
            return;
        }
        say(spinner('Checking'), ' Checking…');
        try {
            const feed = await fetchFeed(template, CHECK_FEED);
            say(icon('check'), `OK: ${feed.format}, ${plural(feed.items.length, 'entry', 'entries')}.`);
        } catch (failure) {
            say(icon('alert'), failure instanceof FetchError ? errorText(failure) : String(failure.message || failure));
        }
    }

    const el = h('div', { class: 'view view-settings' },
        h('div', { class: 'toolbar' },
            h('a', { class: 'icon-button', href: '#/', 'aria-label': 'Back to feeds', title: 'Back to feeds' }, icon('back')),
            h('h1', { class: 'toolbar-title' }, 'Settings')),
        h('section', { class: 'card' },
            h('h2', null, 'Proxy'),
            h('p', null, 'Browsers do not let a page read feeds from other sites, so every feed is loaded through a proxy.'),
            h('p', { class: 'warning' }, icon('alert'),
                'The proxy sees the addresses of all your feeds and your IP. Use only a proxy you trust.'),
            h('form', { class: 'proxy-form', onsubmit: save },
                h('label', { for: 'proxy' }, 'Proxy address'),
                input,
                h('p', { id: 'proxy-hint', class: 'hint' },
                    h('code', null, '{url}'), ' is replaced with the address of a feed. The default is ',
                    h('code', null, DEFAULT_PROXY), '.'),
                h('div', { class: 'form-buttons' },
                    h('button', { type: 'submit', class: 'button primary' }, 'Save'),
                    h('button', { type: 'button', class: 'button needs-network', onclick: check }, 'Check'),
                    h('button', { type: 'button', class: 'button', onclick: () => { input.value = DEFAULT_PROXY; say('The default is in the field, press Save.'); } }, 'Restore default')),
                proxyStatus),
            h('p', null, h('a', { href: PROXY_README, target: '_blank', rel: 'noopener noreferrer' },
                'How to run your own proxy', icon('external', 'opens in a new tab')))),
        h('section', { class: 'card' },
            h('h2', null, 'App'),
            h('p', null, `Version ${self.APP_VERSION || '?'}, service worker: `, swVersion, '.'),
            h('div', { class: 'form-buttons' },
                h('button', { type: 'button', class: 'button', onclick: resetCache }, 'Reset the app cache'),
                h('button', { type: 'button', class: 'button danger', onclick: deleteData }, icon('trash'), 'Delete all data')),
            h('p', { class: 'hint' }, 'Resetting the cache helps when the app looks broken after an update. Your feeds stay.')));

    getProxy().then((template) => {
        input.value = template;
    });
    serviceWorkerVersion().then((version) => {
        swVersion.textContent = version;
    });
    setNetworkButtons(el);

    return { el, title: 'Settings — Stupid RSS Reader', destroy() {} };
}
