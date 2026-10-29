// #/ — the list of feeds, adding feeds, "refresh all".

import * as db from '../db.js';
import { h, icon, spinner, clear, hostOf, plural, setNetworkButtons, timeElement } from '../dom.js';
import { errorText, normalizeFeedUrl, refresh, status, subscribe } from '../feeds.js';
import { safeUrl } from '../sanitize.js';

let savedScroll = 0;

function feedIcon(feed) {
    const src = safeUrl(feed.about?.image, feed.url, { image: true });
    if (!src) {
        return h('span', { class: 'feed-icon feed-icon-empty' }, icon('rss'));
    }
    const img = h('img', { class: 'feed-icon', src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => img.replaceWith(h('span', { class: 'feed-icon feed-icon-empty' }, icon('rss'))), { once: true });
    return img;
}

function errorLine(error) {
    if (!error) {
        return null;
    }
    return h('span', { class: 'feed-error' }, icon('alert'), errorText(error));
}

function feedRow(feed) {
    const loading = status.loading.has(feed.id);
    const title = (typeof feed.about?.title === 'string' && feed.about.title) || hostOf(feed.url);
    const count = feed.newCount
        ? h('span', { class: 'feed-count is-new' }, `${feed.newCount} new`)
        : h('span', { class: 'feed-count' }, feed.count ? plural(feed.count, 'post', 'posts') : 'no posts');
    const updated = timeElement(feed.updatedAt);
    return h('li', { class: `feed-row${loading ? ' is-loading' : ''}` },
        h('a', { class: 'feed-link', href: `#/${feed.id}` },
            feedIcon(feed),
            h('span', { class: 'feed-text' },
                h('span', { class: 'feed-title' }, title),
                h('span', { class: 'feed-url' }, feed.url),
                updated ? h('span', { class: 'feed-updated' }, 'Updated ', updated) : null,
                errorLine(status.errors.get(feed.id))),
            loading ? spinner('Refreshing') : count));
}

function aboutBlock() {
    return h('details', { class: 'card about' },
        h('summary', null, 'About Stupid RSS Reader'),
        h('p', null, "I'm tired of different stupid RSS clients and I created own Stupid RSS Reader."),
        h('h3', null, 'Philosophy'),
        h('p', null, 'The application does not impose anything, but only executes orders: nothing is refreshed or sent until you ask.'),
        h('h3', null, 'Features'),
        h('ul', null,
            h('li', null, 'RSS 2.0, Atom and RSS 1.0 feeds'),
            h('li', null, 'Installs as an app on a phone or a computer, works offline'),
            h('li', null, 'All your data is stored only in this browser (IndexedDB)'),
            h('li', null, 'Open source: ', h('a', { href: 'https://github.com/gurov/stupid-rss-reader', target: '_blank', rel: 'noopener noreferrer' }, 'GitHub'))),
        h('h3', null, 'Proxy'),
        h('p', null, 'Browsers do not let a page read feeds from other sites, so feeds are loaded through a proxy: ',
            h('code', null, 'rss.bizibah.com'), ' by default, or your own one (',
            h('a', { href: '#/settings' }, 'Settings'), '). The proxy sees the address of a feed and your IP and does not keep feed addresses. Images in an opened post load from the sites of the feed authors.'));
}

export function render() {
    let feeds = [];
    let formOpen = false;
    let addMessage = '';

    const list = h('ul', { class: 'feed-list' });
    const progress = h('p', { class: 'progress', 'aria-live': 'polite' });
    const actions = h('div', { class: 'card-actions' });
    const addArea = h('div', { class: 'add-area' });
    const addResult = h('p', { class: 'add-result', 'aria-live': 'polite' });

    const el = h('div', { class: 'view view-home' },
        h('header', { class: 'app-header' },
            h('a', { class: 'brand', href: '#/' },
                h('img', { src: 'assets/fur-boot-green.svg', alt: '', width: 44, height: 44 }),
                h('span', null, 'Stupid RSS Reader')),
            h('a', { class: 'icon-button', href: '#/settings', 'aria-label': 'Settings', title: 'Settings' }, icon('settings'))),
        h('section', { class: 'card feeds' },
            h('div', { class: 'card-head' }, h('h1', null, 'Feeds'), actions),
            progress, list, addArea, addResult),
        aboutBlock());

    function drawProgress() {
        if (status.progress) {
            const { done, total } = status.progress;
            progress.replaceChildren(spinner('Refreshing'), ` Refreshing ${done}/${total}…`);
        } else if (status.summary) {
            const { total, done, failed, added, stoppedFor } = status.summary;
            const parts = [added ? `${plural(added, 'new post', 'new posts')}` : 'No new posts'];
            if (failed) {
                parts.push(`${plural(failed, 'feed', 'feeds')} with errors`);
            }
            if (stoppedFor) {
                parts.push(`stopped: the proxy asks to wait ${stoppedFor} s, ${total - done} not refreshed`);
            }
            progress.replaceChildren(`${parts.join(', ')}.`);
        } else {
            progress.replaceChildren();
        }
    }

    function drawActions() {
        clear(actions);
        if (!feeds.length) {
            return;
        }
        const canShare = typeof navigator.share === 'function';
        actions.append(
            h('button', {
                type: 'button', class: 'icon-button', title: canShare ? 'Share the list of feeds' : 'Copy the list of feeds',
                'aria-label': canShare ? 'Share the list of feeds' : 'Copy the list of feeds', onclick: shareList,
            }, icon(canShare ? 'share' : 'copy')),
            h('button', {
                type: 'button', class: 'button primary needs-network', 'data-busy': status.progress ? '1' : null,
                onclick: () => refresh(feeds),
            }, icon('refresh'), 'Refresh all'));
        setNetworkButtons(el);
    }

    function drawList() {
        list.replaceChildren(...feeds.map(feedRow));
    }

    function drawAdd() {
        clear(addArea);
        if (!formOpen) {
            addArea.append(h('button', { type: 'button', class: 'button', onclick: () => { formOpen = true; drawAdd(); addArea.querySelector('textarea').focus(); } },
                icon('plus'), 'Add feeds'));
            return;
        }
        const textarea = h('textarea', {
            id: 'new-feeds', rows: 3, inputmode: 'url', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false',
            placeholder: 'https://example.com/feed.xml\nhttps://example.org/atom.xml',
        });
        const form = h('form', { class: 'add-form', onsubmit: (event) => { event.preventDefault(); addFeeds(textarea.value); } },
            h('label', { for: 'new-feeds' }, feeds.length
                ? 'Feed addresses, one per line'
                : 'Add your first feeds: paste the addresses of RSS or Atom feeds, one per line'),
            textarea,
            h('div', { class: 'form-buttons' },
                h('button', { type: 'submit', class: 'button primary' }, 'Add'),
                feeds.length ? h('button', { type: 'button', class: 'button', onclick: () => { formOpen = false; drawAdd(); } }, 'Cancel') : null));
        addArea.append(form);
    }

    async function addFeeds(text) {
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        const urls = [];
        let invalid = 0;
        for (const line of lines) {
            const url = normalizeFeedUrl(line);
            if (!url) {
                invalid++;
            } else if (!urls.includes(url)) {
                urls.push(url);
            }
        }
        const { added, existing } = urls.length ? await db.addFeeds(urls) : { added: [], existing: 0 };
        const parts = [`Added ${plural(added.length, 'feed', 'feeds')}`];
        if (existing) {
            parts.push(`${existing} already in the list`);
        }
        if (invalid) {
            parts.push(`${plural(invalid, 'line is', 'lines are')} not a valid address`);
        }
        addMessage = `${parts.join(', ')}.`;
        addResult.textContent = addMessage;
        if (added.length) {
            formOpen = false;
        }
        await load();
        // Adding is already an order: load the new feeds right away.
        if (added.length && navigator.onLine) {
            refresh(added);
        }
    }

    async function shareList() {
        const text = feeds.map((feed) => feed.url).join('\n');
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: 'Stupid RSS Reader feeds', text });
            } catch {
                // cancelled
            }
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            addResult.textContent = `Copied ${plural(feeds.length, 'feed address', 'feed addresses')} to the clipboard.`;
        } catch {
            addResult.textContent = 'Could not copy to the clipboard.';
        }
    }

    async function load() {
        feeds = await db.getFeeds();
        if (!feeds.length) {
            formOpen = true;
        }
        drawActions();
        drawList();
        drawAdd();
        drawProgress();
    }

    const unsubscribe = subscribe(async () => {
        feeds = await db.getFeeds();
        drawList();
        drawProgress();
        drawActions();
    });

    load().then(() => window.scrollTo(0, savedScroll));

    return {
        el,
        title: 'Stupid RSS Reader',
        destroy() {
            savedScroll = window.scrollY;
            unsubscribe();
        },
    };
}
