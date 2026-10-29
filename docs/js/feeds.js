// Loading feeds through a proxy and the state of refreshing, shared by the views.
// The proxy is untrusted too, even ours: its answer goes through the same size
// limits, parsing and sanitizing as a feed, and its error text is shown as text.

import * as db from './db.js';
import { parseFeed, FeedParseError } from './parser.js';

export const DEFAULT_PROXY = 'https://rss.bizibah.com/?url={url}';
export const CHECK_FEED = 'https://github.com/gurov/stupid-rss-reader/commits/master.atom';
const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_ERROR_BYTES = 4096;
const PARALLEL = 5;
const TIMEOUT = 30000;

// --- Proxy template -------------------------------------------------------------

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// → { template } or { error }
export function checkProxyTemplate(raw) {
    let template = String(raw || '').trim();
    if (!template) {
        return { error: 'Enter the address of the proxy' };
    }
    if (!template.includes('{url}')) {
        template += `${template.includes('?') ? '&' : '?'}url={url}`;
    }
    if (template.length > 512) {
        return { error: 'The address is too long (512 characters at most)' };
    }
    let url;
    try {
        url = new URL(proxyUrl(template, 'https://example.com/feed.xml'));
    } catch {
        return { error: 'This is not a valid address' };
    }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname))) {
        return { error: 'Only https (or http on localhost)' };
    }
    if (url.username || url.password) {
        return { error: 'No login or password in the address' };
    }
    return { template };
}

export function proxyUrl(template, feedUrl) {
    return template.split('{url}').join(encodeURIComponent(feedUrl));
}

export async function getProxy() {
    const template = await db.getSetting('proxy', DEFAULT_PROXY);
    return checkProxyTemplate(template).template || DEFAULT_PROXY;
}

// --- Feed addresses -------------------------------------------------------------

// A line from the "add feeds" form → a normalized URL or null. new URL() lowercases
// only the scheme and the host: paths and queries are case sensitive (YouTube, #9).
export function normalizeFeedUrl(line) {
    const value = line.trim();
    if (!value || value.length > 2048 || /\s/.test(value)) {
        return null;
    }
    let url;
    try {
        url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    } catch {
        return null;
    }
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) {
        return null;
    }
    // A name with a dot (IDN is punycode here already) or an IPv6 literal.
    if (!/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$|^\[[0-9a-f:.]+\]$/i.test(url.hostname)) {
        return null;
    }
    url.hash = '';
    return url.href;
}

// --- Fetching -------------------------------------------------------------------

export class FetchError extends Error {
    constructor(message, { status = 0, detail = '', retryAfter = 0 } = {}) {
        super(message);
        this.status = status;
        this.detail = detail;
        this.retryAfter = retryAfter;
    }
}

const STATUS_TEXT = {
    400: 'The proxy did not accept this feed address',
    403: 'The proxy does not allow this address',
    404: 'The proxy address is wrong (404)',
    422: 'This is a web page, not an RSS or Atom feed',
    429: 'Too many requests, try again later',
    502: 'The site did not answer',
    503: 'The proxy is busy, try again later',
    504: 'The site did not answer in time',
};

// The message for people. The text of the proxy is added where it says more than the
// status (which rule refused the address, what the site answered) and for unknown codes.
const DETAIL_ADDS = new Set([400, 403, 404, 502]);

export function errorText(error) {
    const { message, detail, status: code } = error;
    if (detail && detail !== message && (DETAIL_ADDS.has(code) || !STATUS_TEXT[code])) {
        return `${message}: ${detail}`;
    }
    return message;
}

function retryAfter(header) {
    if (!header) {
        return 0;
    }
    const seconds = Number(header);
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds);
    }
    const date = Date.parse(header);
    return Number.isNaN(date) ? 0 : Math.max(0, (date - Date.now()) / 1000);
}

async function readLimited(response, max) {
    const length = Number(response.headers.get('Content-Length'));
    if (length > max) {
        response.body?.cancel();
        return null;
    }
    if (!response.body) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        return bytes.length > max ? null : bytes;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        total += value.length;
        if (total > max) {
            reader.cancel();
            return null;
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}

// Bytes → text. The encoding: BOM, then charset of Content-Type (CORS lets it be
// read), then <?xml encoding="…"?>, then UTF-8.
export function decodeFeed(bytes, contentType) {
    let label;
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        label = 'utf-8';
    } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        label = 'utf-16le';
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        label = 'utf-16be';
    } else {
        const head = String.fromCharCode(...bytes.subarray(0, 1024));
        label = /charset\s*=\s*"?([\w.:-]+)/i.exec(contentType || '')?.[1]
            || /^\s*<\?xml[^>]*?\bencoding\s*=\s*["']([\w.:-]+)["']/i.exec(head)?.[1]
            || 'utf-8';
    }
    let decoder;
    try {
        decoder = new TextDecoder(label);
    } catch {
        decoder = new TextDecoder('utf-8');
    }
    return decoder.decode(bytes);
}

// → { format, about, items }, or throws FetchError
export async function fetchFeed(template, feedUrl) {
    let response;
    try {
        response = await fetch(proxyUrl(template, feedUrl), {
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            signal: AbortSignal.timeout(TIMEOUT),
        });
    } catch (error) {
        if (error.name === 'TimeoutError') {
            throw new FetchError('The proxy did not answer in time');
        }
        throw new FetchError(navigator.onLine ? 'Could not reach the proxy' : 'No connection');
    }
    if (!response.ok) {
        let detail = '';
        try {
            const bytes = await readLimited(response, MAX_ERROR_BYTES);
            detail = bytes ? new TextDecoder().decode(bytes).replace(/\s+/g, ' ').trim().slice(0, 200) : '';
        } catch {
            // no text, the status is enough
        }
        throw new FetchError(STATUS_TEXT[response.status] || `The proxy answered ${response.status}`, {
            status: response.status,
            detail,
            retryAfter: retryAfter(response.headers.get('Retry-After')),
        });
    }
    let bytes;
    try {
        bytes = await readLimited(response, MAX_FEED_BYTES);
    } catch {
        throw new FetchError('The connection broke while loading the feed');
    }
    if (!bytes) {
        throw new FetchError('The feed is larger than 5 MB');
    }
    try {
        return parseFeed(decodeFeed(bytes, response.headers.get('Content-Type')), feedUrl);
    } catch (error) {
        if (error instanceof FeedParseError) {
            throw new FetchError(`Could not read the feed: ${error.message}`);
        }
        throw error;
    }
}

// --- Refreshing -----------------------------------------------------------------

// What the views show while feeds load. Changes are announced to subscribers.
export const status = {
    loading: new Set(),   // feed ids
    errors: new Map(),    // feed id → FetchError
    progress: null,       // { done, total, failed } while "refresh all" runs
    summary: null,        // the result of the last run: { total, failed, added, stoppedFor }
};

const subscribers = new Set();

export function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

function changed(feedId = null) {
    subscribers.forEach((fn) => fn(feedId));
}

async function refreshOne(feed, template) {
    status.loading.add(feed.id);
    status.errors.delete(feed.id);
    changed(feed.id);
    try {
        const parsed = await fetchFeed(template, feed.url);
        const { added } = await db.savePosts(feed.id, parsed.about, parsed.items);
        return { added };
    } catch (error) {
        status.errors.set(feed.id, error instanceof FetchError ? error : new FetchError(String(error.message || error)));
        return { error };
    } finally {
        status.loading.delete(feed.id);
        changed(feed.id);
    }
}

// Refreshes the feeds, at most PARALLEL at once. On 429 (or 503 with Retry-After)
// stops: the reader must not add load to a proxy that asks to wait.
export async function refresh(feeds) {
    const queue = feeds.filter((feed) => !status.loading.has(feed.id));
    if (!queue.length) {
        return null;
    }
    const template = await getProxy();
    const run = { done: 0, total: queue.length, failed: 0, added: 0, stoppedFor: 0 };
    const single = feeds.length === 1;
    if (!single) {
        status.progress = run;
        status.summary = null;
        changed();
    }
    const worker = async () => {
        while (queue.length && !run.stoppedFor) {
            const result = await refreshOne(queue.shift(), template);
            run.done++;
            if (result.error) {
                run.failed++;
                const { status: code, retryAfter: wait } = result.error;
                if (code === 429 || (code === 503 && wait)) {
                    run.stoppedFor = Math.max(1, Math.ceil(wait || 60));
                }
            } else {
                run.added += result.added;
            }
            changed();
        }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
    if (!single) {
        status.progress = null;
        status.summary = run;
        changed();
    }
    return run;
}
