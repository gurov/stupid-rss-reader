// #/<id> — the posts of one feed.

import * as db from '../db.js';
import { h, icon, spinner, hostOf, plural, replace, setNetworkButtons, timeElement } from '../dom.js';
import { errorText, refresh, status, subscribe } from '../feeds.js';
import { renderPost } from '../post.js';
import { safeUrl } from '../sanitize.js';

const PAGE = 20;
// What to restore when coming back to a feed: shown count, opened posts, scroll.
const memory = new Map();

export function render(feedId) {
    const state = memory.get(feedId) || { shown: PAGE, open: new Set(), scroll: 0 };
    memory.set(feedId, state);
    let feed = null;
    let posts = [];

    const title = h('span', { class: 'toolbar-title' });
    const menu = h('div', { class: 'menu', id: 'feed-menu', hidden: true });
    const menuButton = h('button', {
        type: 'button', class: 'icon-button', 'aria-label': 'More actions', title: 'More actions',
        'aria-expanded': 'false', 'aria-controls': 'feed-menu', onclick: () => toggleMenu(),
    }, icon('more'));
    const refreshButton = h('button', {
        type: 'button', class: 'icon-button needs-network', 'aria-label': 'Refresh', title: 'Refresh',
        onclick: () => feed && refresh([feed]),
    }, icon('refresh'));
    const about = h('section', { class: 'card feed-about' });
    const message = h('p', { class: 'progress', 'aria-live': 'polite' });
    const list = h('ol', { class: 'posts' });
    const more = h('div', { class: 'more' });

    const el = h('div', { class: 'view view-feed' },
        h('div', { class: 'toolbar' },
            h('a', { class: 'icon-button', href: '#/', 'aria-label': 'Back to feeds', title: 'Back to feeds' }, icon('back')),
            title,
            refreshButton,
            h('button', {
                type: 'button', class: 'icon-button', 'aria-label': 'Mark all as read', title: 'Mark all as read',
                onclick: markAllRead,
            }, icon('check')),
            menuButton),
        menu, about, message, list, more);

    function toggleMenu(open = menu.hidden) {
        menu.hidden = !open;
        menuButton.setAttribute('aria-expanded', String(open));
    }

    function feedTitle() {
        return (typeof feed.about?.title === 'string' && feed.about.title) || hostOf(feed.url);
    }

    function drawAbout() {
        const info = feed.about || {};
        const link = safeUrl(info.link, feed.url);
        const image = safeUrl(info.image, feed.url, { image: true });
        const error = status.errors.get(feed.id);
        const img = image ? h('img', { class: 'feed-image', src: image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null;
        img?.addEventListener('error', () => img.remove(), { once: true });
        title.textContent = feedTitle();
        replace(about, 
            img,
            h('div', { class: 'feed-about-text' },
                h('h1', null, feedTitle()),
                typeof info.description === 'string' && info.description ? h('p', null, info.description.slice(0, 2048)) : null,
                link ? h('p', null, h('a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, hostOf(link), icon('external', 'opens in a new tab'))) : null,
                h('p', { class: 'feed-url' }, feed.url),
                h('p', { class: 'muted' },
                    plural(feed.count || 0, 'post', 'posts'),
                    feed.newCount ? `, ${feed.newCount} new` : '',
                    feed.updatedAt ? [', updated ', timeElement(feed.updatedAt)] : ''),
                error ? h('p', { class: 'feed-error' }, icon('alert'), errorText(error)) : null));
        refreshButton.dataset.busy = status.loading.has(feed.id) ? '1' : '';
        setNetworkButtons(el);
        replace(message, status.loading.has(feed.id) ? spinner('Refreshing') : '', status.loading.has(feed.id) ? ' Refreshing…' : '');
    }

    function drawMenu() {
        replace(menu, 
            posts.length ? h('button', { type: 'button', class: 'button danger', onclick: deleteAllPosts }, icon('trash'), 'Delete all posts') : null,
            h('button', { type: 'button', class: 'button danger', onclick: deleteFeed }, icon('trash'), 'Delete the feed'));
    }

    function drawPosts() {
        const base = safeUrl(feed.about?.link, feed.url) || feed.url;
        list.replaceChildren(...posts.slice(0, state.shown).map((post) => renderPost(post, {
            feedBase: base,
            open: state.open.has(post.id),
            onToggle: (p, open) => (open ? state.open.add(p.id) : state.open.delete(p.id)),
            onOpen: async (p) => {
                feed = await db.markRead(feed.id, [p.id]) || feed;
                drawAbout();
            },
        })));
        if (!posts.length) {
            list.append(h('li', { class: 'empty' }, status.errors.has(feed.id)
                ? 'No posts: the feed could not be loaded.'
                : 'No posts yet. Refresh the feed to load them.'));
        }
        replace(more, state.shown < posts.length
            ? h('button', { type: 'button', class: 'button', onclick: () => { state.shown += PAGE; drawPosts(); } },
                `Show ${Math.min(PAGE, posts.length - state.shown)} more`)
            : '');
    }

    async function load() {
        feed = await db.getFeed(feedId);
        if (!feed) {
            replace(about, h('h1', null, 'No such feed'), h('p', null, h('a', { href: '#/' }, 'Back to the feeds')));
            return false;
        }
        posts = await db.getPosts(feedId);
        document.title = `${feedTitle()} — Stupid RSS Reader`;
        drawAbout();
        drawMenu();
        drawPosts();
        return true;
    }

    async function markAllRead() {
        if (!feed) {
            return;
        }
        feed = await db.markRead(feed.id) || feed;
        posts.forEach((post) => {
            post.isNew = false;
        });
        drawAbout();
        drawPosts();
    }

    async function deleteAllPosts() {
        if (confirm(`Delete all posts of “${feedTitle()}”? They will be loaded again on the next refresh.`)) {
            await db.deletePosts(feed.id);
            state.open.clear();
            toggleMenu(false);
            load();
        }
    }

    async function deleteFeed() {
        if (confirm(`Delete the feed “${feedTitle()}” and all its posts?`)) {
            await db.deleteFeed(feed.id);
            memory.delete(feedId);
            location.hash = '#/';
        }
    }

    const unsubscribe = subscribe(async (changedId) => {
        if (changedId !== feedId || !feed) {
            return;
        }
        if (status.loading.has(feedId)) {
            drawAbout();
            return;
        }
        await load();
    });

    load().then((found) => found && window.scrollTo(0, state.scroll));

    return {
        el,
        title: 'Feed — Stupid RSS Reader',
        destroy() {
            state.scroll = window.scrollY;
            unsubscribe();
        },
    };
}
