// Everything that comes from a feed or a proxy goes through this module before it
// reaches the DOM. The rules:
//   - the interface is built with DOM API (dom.js), text goes to textContent;
//   - every href and src from a feed goes through safeUrl();
//   - the HTML of a post body goes only through sanitizePost(), which returns a DOM
//     fragment: there is no innerHTML in the reader at all.

import DOMPurify from '../vendor/purify.es.js';

// DOMParser.parseFromString is a Trusted Types sink. Its documents are inert: scripts
// do not run there and images do not load, so the raw string may be passed. This
// policy is private to the module and used only for DOMParser.
const inertPolicy = globalThis.trustedTypes?.createPolicy('srr-inert', {
    createHTML: (text) => text,
});

export function parseInert(text, type) {
    const value = inertPolicy ? inertPolicy.createHTML(text) : text;
    return new DOMParser().parseFromString(value, type);
}

// HTML (or text with entities) → plain text, whitespace collapsed.
export function textFromHtml(html, max = 1024) {
    if (html == null) {
        return '';
    }
    let text = String(html);
    if (/[<&]/.test(text)) {
        const doc = parseInert(text, 'text/html');
        doc.querySelectorAll('script, style, template').forEach((node) => node.remove());
        text = doc.body ? doc.body.textContent : '';
    }
    return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

const IMAGE_DATA = /^data:image\/(?:png|gif|jpeg|jpg|webp|avif|bmp);/i;

// The only way to an href or src from a feed. Relative addresses are resolved against
// the post or the feed, not against the reader. Only absolute http(s); for images
// also data:image/*. Everything else (javascript:, data:text/html, vbscript:...) → null.
export function safeUrl(raw, base, { image = false } = {}) {
    if (typeof raw !== 'string') {
        return null;
    }
    const value = raw.trim();
    if (!value || value.length > 4096) {
        return null;
    }
    let url;
    try {
        url = base ? new URL(value, base) : new URL(value);
    } catch {
        return null;
    }
    if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.username || url.password ? null : url.href;
    }
    if (image && url.protocol === 'data:' && IMAGE_DATA.test(url.href)) {
        return url.href;
    }
    return null;
}

const ALLOWED_TAGS = [
    'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup',
    'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 'rp', 'rt',
    'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td',
    'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
];

const CONFIG = {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan', 'datetime'],
    // Explicitly, in case the allow list above grows by mistake.
    FORBID_TAGS: ['svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'option', 'iframe',
        'frame', 'object', 'embed', 'base', 'meta', 'link', 'style', 'script', 'template', 'noscript',
        'video', 'audio', 'source', 'track', 'picture', 'portal', 'dialog'],
    // No style (CSS can leak and track), no id/name (DOM clobbering), no class.
    FORBID_ATTR: ['style', 'id', 'name', 'class', 'srcset', 'action', 'formaction', 'xlink:href'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    KEEP_CONTENT: true,
    // A fragment, not a string: nothing is parsed a second time (mXSS).
    RETURN_DOM_FRAGMENT: true,
};

let currentBase = null;

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.hasAttribute('href')) {
        const url = safeUrl(node.getAttribute('href'), currentBase);
        if (url) {
            node.setAttribute('href', url);
        } else {
            node.removeAttribute('href');
        }
    }
    if (node.hasAttribute('src')) {
        const url = safeUrl(node.getAttribute('src'), currentBase, { image: node.nodeName === 'IMG' });
        if (url) {
            node.setAttribute('src', url);
        } else {
            node.removeAttribute('src');
        }
    }
    if (node.nodeName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.nodeName === 'IMG') {
        node.setAttribute('loading', 'lazy');
        node.setAttribute('decoding', 'async');
        node.setAttribute('referrerpolicy', 'no-referrer');
    }
});

// The HTML of a post → a sanitized DocumentFragment. base resolves relative links.
export function sanitizePost(html, base) {
    if (!DOMPurify.isSupported) {
        const fragment = document.createDocumentFragment();
        fragment.append(textFromHtml(html, Infinity));
        return fragment;
    }
    currentBase = base || null;
    try {
        return DOMPurify.sanitize(String(html || ''), CONFIG);
    } finally {
        currentBase = null;
    }
}
