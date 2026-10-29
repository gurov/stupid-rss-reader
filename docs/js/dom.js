// Building the interface without innerHTML, and formatting for people.

const SAFE_LINK = /^(?:https?:|#|\.\/|assets\/|data:image\/)/i;

// h('a', { href, onclick }, 'text', child, [children]) → an element.
// Text always becomes a text node. href and src must already be safe (sanitize.js
// safeUrl() for anything from a feed): a javascript: or other address throws.
export function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) {
        if (value == null || value === false) {
            continue;
        }
        if (name.startsWith('on')) {
            el.addEventListener(name.slice(2), value);
        } else if (name === 'class') {
            el.className = value;
        } else if (name === 'style' || name === 'srcdoc') {
            throw new Error(`h(): ${name} is not allowed`);
        } else {
            if ((name === 'href' || name === 'src') && !SAFE_LINK.test(String(value))) {
                throw new Error(`h(): unsafe ${name}`);
            }
            el.setAttribute(name, value === true ? '' : String(value));
        }
    }
    append(el, children);
    return el;
}

export function append(el, children) {
    for (const child of children.flat(Infinity)) {
        if (child == null || child === false || child === '') {
            continue;
        }
        el.append(child instanceof Node ? child : String(child));
    }
    return el;
}

export function clear(el) {
    el.replaceChildren();
    return el;
}

// Like el.replaceChildren(), but skips null, false and '' (replaceChildren would turn
// null into the text "null").
export function replace(el, ...children) {
    return append(clear(el), children);
}

const SVG = 'http://www.w3.org/2000/svg';

// An icon from the sprite in index.html. With a label it is announced, without it is
// decorative.
export function icon(name, label) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', `icon icon-${name}`);
    svg.setAttribute('viewBox', '0 0 24 24');
    if (label) {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', label);
    } else {
        svg.setAttribute('aria-hidden', 'true');
    }
    const use = document.createElementNS(SVG, 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.append(use);
    return svg;
}

export function spinner(label = 'Loading') {
    return h('span', { class: 'spinner', role: 'status', 'aria-label': label });
}

// Buttons that need the network (class needs-network) are disabled offline, and
// while busy (data-busy="1").
export function setNetworkButtons(root = document) {
    for (const button of root.querySelectorAll('.needs-network')) {
        button.disabled = !navigator.onLine || button.dataset.busy === '1';
    }
}

// --- Formatting -----------------------------------------------------------------

// Old posts from rss2json have "YYYY-MM-DD HH:mm:ss" in UTC, new ones ISO 8601.
export function toTime(value) {
    if (!value) {
        return NaN;
    }
    const old = /^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d)$/.exec(value);
    return Date.parse(old ? `${old[1]}T${old[2]}Z` : value);
}

// In the language of the interface, in the time zone of the user.
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const fullDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
const shortDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

// "3 hours ago" for the last week, a date after that. Returns { text, title } or null.
export function formatDate(value, now = Date.now()) {
    const time = toTime(value);
    if (Number.isNaN(time)) {
        return null;
    }
    const date = new Date(time);
    const seconds = Math.round((time - now) / 1000);
    const abs = Math.abs(seconds);
    let text;
    if (abs < 60) {
        text = relative.format(0, 'second');
    } else if (abs < 3600) {
        text = relative.format(Math.round(seconds / 60), 'minute');
    } else if (abs < 86400) {
        text = relative.format(Math.round(seconds / 3600), 'hour');
    } else if (abs < 7 * 86400) {
        text = relative.format(Math.round(seconds / 86400), 'day');
    } else {
        text = shortDate.format(date);
    }
    return { text, title: fullDate.format(date), iso: date.toISOString() };
}

export function timeElement(value) {
    const date = formatDate(value);
    return date ? h('time', { datetime: date.iso, title: date.title }, date.text) : null;
}

export function formatBytes(size) {
    if (!size) {
        return '';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value.toFixed(value < 10 && unit ? 1 : 0)} ${units[unit]}`;
}

export function hostOf(address) {
    try {
        return new URL(address).hostname.replace(/^www\./, '');
    } catch {
        return address;
    }
}

// Minutes to read, by words of the text, not by the length of the HTML. Only an
// estimate: the tags are cut with a regular expression, nothing is rendered.
export function readMinutes(html) {
    const words = String(html || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.round(words / 200);
}

export function plural(count, one, many) {
    return `${count} ${count === 1 ? one : many}`;
}
