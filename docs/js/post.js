// One post in the list of a feed. The body is sanitized and built only when the post
// is opened: until then no image or tracker from it is loaded.

import { h, icon, formatBytes, readMinutes, timeElement } from './dom.js';
import { safeUrl, sanitizePost, textFromHtml } from './sanitize.js';

// New posts have titles as text already. Posts saved from rss2json (they have the
// description field) may have HTML or entities there.
function postTitle(post) {
    const title = typeof post.title === 'string' ? post.title : '';
    return ('description' in post ? textFromHtml(title) : title) || 'Untitled';
}

function attachment(post, base) {
    const enc = post.enclosure;
    if (!enc) {
        return null;
    }
    const url = safeUrl(enc.url || enc.link, base);
    const thumbnail = safeUrl(enc.thumbnail, base, { image: true });
    const type = typeof enc.type === 'string' ? enc.type.slice(0, 100) : '';
    if (!url && !thumbnail) {
        return null;
    }
    if (type.startsWith('image/') && url) {
        return h('figure', { class: 'post-attachment' },
            h('img', { src: url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }));
    }
    const info = [type, formatBytes(Number(enc.length) || 0)].filter(Boolean).join(', ');
    return h('p', { class: 'post-attachment' },
        thumbnail ? h('img', { src: thumbnail, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null,
        url ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' },
            icon('attachment'), 'Attachment', icon('external', 'opens in a new tab')) : null,
        info ? h('span', { class: 'muted' }, ` ${info}`) : null);
}

function body(post, base, link, collapse) {
    const categories = Array.isArray(post.categories)
        ? post.categories.filter((c) => typeof c === 'string' && c).slice(0, 20) : [];
    return [
        h('div', { class: 'post-content' }, sanitizePost(post.content || post.description || '', base)),
        categories.length ? h('p', { class: 'post-categories' }, categories.join(', ')) : null,
        attachment(post, base),
        h('div', { class: 'post-actions' },
            h('button', { type: 'button', class: 'button', onclick: collapse }, icon('chevron-up'), 'Collapse'),
            link ? h('a', { class: 'button', href: link, target: '_blank', rel: 'noopener noreferrer' },
                'Open original', icon('external', 'opens in a new tab')) : null),
    ];
}

// post: a record from the database; feedBase: the link of the feed or its URL.
// onOpen(post) is called when a new post is opened (to mark it read).
export function renderPost(post, { feedBase, open = false, onToggle, onOpen }) {
    const link = safeUrl(post.link, feedBase);
    const base = link || feedBase;
    const thumbnail = safeUrl(post.thumbnail, base, { image: true });
    const bodyId = `post-body-${post.id}`;
    const minutes = readMinutes(post.content || post.description);
    const meta = [
        post.isNew ? h('span', { class: 'badge-new' }, 'New') : null,
        typeof post.author === 'string' && post.author ? h('span', null, post.author.slice(0, 256)) : null,
        timeElement(post.pubDate),
        minutes >= 1 ? h('span', null, `${minutes} min read`) : null,
    ].filter(Boolean);

    const head = h('button', {
        type: 'button', class: 'post-head', 'aria-expanded': 'false', 'aria-controls': bodyId,
    },
    thumbnail ? h('img', { class: 'post-thumb', src: thumbnail, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null,
    h('span', { class: 'post-head-text' },
        meta.length ? h('span', { class: 'post-meta' }, meta) : null,
        h('span', { class: 'post-title' }, postTitle(post))),
    icon('chevron-down'));

    const bodyEl = h('div', { class: 'post-body', id: bodyId, hidden: true });
    const item = h('li', { class: `post${post.isNew ? ' is-new' : ''}` }, h('h2', { class: 'post-heading' }, head), bodyEl);

    const setOpen = (value, { scroll = false } = {}) => {
        if (value && !bodyEl.hasChildNodes()) {
            bodyEl.append(...body(post, base, link, () => setOpen(false, { scroll: true })).filter(Boolean));
        }
        bodyEl.hidden = !value;
        head.setAttribute('aria-expanded', String(value));
        item.classList.toggle('is-open', value);
        if (value && post.isNew) {
            post.isNew = false;
            item.classList.remove('is-new');
            item.querySelector('.badge-new')?.remove();
            onOpen?.(post);
        }
        if (!value && scroll && head.getBoundingClientRect().top < 0) {
            head.scrollIntoView({ block: 'start' });
            head.focus({ preventScroll: true });
        }
        onToggle?.(post, value);
    };
    head.addEventListener('click', () => setOpen(bodyEl.hidden));
    if (open) {
        setOpen(true);
    }
    return item;
}
