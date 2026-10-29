// Browser tests of the reader. Opened by tests/index.html (with the CSP and Trusted
// Types of the app) and tests/no-csp.html (sanitizing alone, no second layer).
// tests/run.sh runs both in headless Chrome.

import { parseFeed, parseDate, MAX_ENTRIES } from '../docs/js/parser.js';
import { decodeFeed, fetchFeed, normalizeFeedUrl, checkProxyTemplate, FetchError } from '../docs/js/feeds.js';
import { safeUrl, textFromHtml, sanitizePost } from '../docs/js/sanitize.js';
import { renderPost } from '../docs/js/post.js';
import { toTime } from '../docs/js/dom.js';
import * as db from '../docs/js/db.js';

const results = document.getElementById('results');
const tests = [];
let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function equal(actual, expected, message = '') {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    assert(a === e, `${message} expected ${e}, got ${a}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fixture(name) {
    const response = await fetch(`fixtures/${name}`);
    return new Uint8Array(await response.arrayBuffer());
}

async function feedFrom(name, url = 'https://example.com/feed.xml') {
    return parseFeed(decodeFeed(await fixture(name), ''), url);
}

// --- Parser ---------------------------------------------------------------------

test('RSS 2.0: channel and fields', async () => {
    const feed = await feedFrom('rss2.xml');
    equal(feed.format, 'RSS 2.0');
    equal(feed.about, { title: 'Example & Co', link: 'https://example.com/', description: 'An example feed', image: 'https://example.com/logo.png', author: 'Ed Itor' });
    const [first, second, third, fourth] = feed.items;
    equal(first.title, 'First post', 'HTML in a title becomes text:');
    equal([first.link, first.guid, first.pubDate, first.author], ['https://example.com/posts/1', 'post-1', '2025-06-10T04:00:00.000Z', 'Alice']);
    assert(first.content.includes('Full') && !first.content.includes('Short'), 'content:encoded wins over description');
    equal(first.categories, ['One', 'Two']);
    equal(first.enclosure, { url: 'https://example.com/a.mp3', type: 'audio/mpeg', length: 12345678 });
    equal(first.thumbnail, 'https://example.com/t.jpg');
    equal(second.pubDate, '2025-06-11T07:00:00.000Z', '+0300:');
    equal(second.author, 'Bob Example', 'RSS author "email (Name)":');
    equal(third.author, 'Ed Itor', 'managingEditor as the fallback:');
    equal(second.content, '<p>Escaped &amp; html</p>');
    equal([third.link, third.guid, third.pubDate], ['https://example.com/posts/3', 'https://example.com/posts/3', '2025-06-12T15:00:00.000Z'], 'permalink guid, EST:');
    assert(fourth.guid.startsWith('h:') && fourth.title === '', 'an entry without anything gets a hash id');
});

test('Atom: text constructs, links, xhtml', async () => {
    const feed = await feedFrom('atom.xml', 'https://example.org/atom.xml');
    equal(feed.format, 'Atom');
    equal(feed.about, { title: 'Atom <Example>', link: 'https://example.org/', description: 'Subtitle', image: 'https://example.org/favicon.png', author: 'Bob' });
    const [one, two] = feed.items;
    equal([one.title, one.link, one.guid, one.pubDate, one.author], ['Entry & one', 'https://example.org/2025/one', 'urn:uuid:1', '2025-06-10T10:00:00.000Z', 'Bob']);
    assert(/<p[^>]*>Hello <em>world<\/em><\/p>/.test(one.content), `xhtml content: ${one.content}`);
    equal(one.categories, ['Technology']);
    equal(one.enclosure, { url: 'https://example.org/pic.png', type: 'image/png', length: 100 });
    assert(two.content.includes('&lt;text&gt;') && two.content.includes('<a href="https://example.org/x">'), `text summary: ${two.content}`);
    equal(two.thumbnail, 'https://i.example.org/t.jpg');
});

test('RSS 1.0 (RDF)', async () => {
    const feed = await feedFrom('rdf.xml');
    equal([feed.format, feed.about.title, feed.items.length], ['RSS 1.0', 'RDF Example', 2]);
    equal([feed.items[0].title, feed.items[0].link, feed.items[0].author, feed.items[0].pubDate], ['A', 'https://example.net/a', 'Carol', '2025-06-10T12:00:00.000Z']);
});

test('windows-1251 by the XML declaration and by Content-Type', async () => {
    const bytes = await fixture('cp1251.xml');
    equal(parseFeed(decodeFeed(bytes, ''), 'https://example.ru/').items[0].title, 'Привет, мир');
    equal(parseFeed(decodeFeed(bytes, 'text/plain; charset=windows-1251'), 'https://example.ru/').about.title, 'Новости');
});

test('BOM wins, unknown charset falls back to UTF-8', () => {
    const utf16 = new Uint8Array([0xff, 0xfe, 0x3c, 0, 0x61, 0, 0x3e, 0]);
    equal(decodeFeed(utf16, 'text/plain; charset=windows-1251'), '<a>');
    equal(decodeFeed(new TextEncoder().encode('é'), 'text/plain; charset=no-such-charset'), 'é');
});

test('broken XML and HTML pages are errors', async () => {
    for (const name of ['broken.xml', 'page.html']) {
        let error = null;
        try {
            await feedFrom(name);
        } catch (e) {
            error = e;
        }
        assert(error && error.name === 'Error', `${name} must not parse`);
    }
});

test('limits: entries, title, categories, content', () => {
    const items = Array.from({ length: 1000 }, (_, i) => `<item><title>${i}</title><guid>g${i}</guid></item>`).join('');
    equal(parseFeed(`<rss><channel><title>t</title>${items}</channel></rss>`, 'https://x.example/').items.length, MAX_ENTRIES);
    const categories = Array.from({ length: 30 }, (_, i) => `<category>c${i}</category>`).join('');
    const big = parseFeed(`<rss><channel><item><title>${'a'.repeat(5000)}</title>${categories}<description>${'b'.repeat(600 * 1024)}</description></item></channel></rss>`, 'https://x.example/');
    equal([big.items[0].title.length, big.items[0].categories.length, big.items[0].content.length], [1024, 20, 512 * 1024]);
});

test('dates', () => {
    equal(parseDate('Tue, 10 Jun 2025 04:00:00 GMT'), '2025-06-10T04:00:00.000Z');
    equal(parseDate('10 Jun 2025 04:00:00 MSK'), '2025-06-10T01:00:00.000Z');
    equal(parseDate('2025-06-10T12:00:00+02:00'), '2025-06-10T10:00:00.000Z');
    equal([parseDate(''), parseDate('yesterday'), parseDate('1970-01-01T00:00:00Z')], ['', '', '']);
    equal(toTime('2021-03-01 10:20:30'), Date.UTC(2021, 2, 1, 10, 20, 30), 'old rss2json format:');
});

// --- Addresses ------------------------------------------------------------------

test('safeUrl', () => {
    const base = 'https://example.com/a/b';
    equal(safeUrl('/x', base), 'https://example.com/x');
    equal(safeUrl('//cdn.example/y', base), 'https://cdn.example/y');
    equal(safeUrl('http://example.com/', null), 'http://example.com/');
    for (const bad of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', '\u0001javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'https://user:pass@example.com/', '', null, 42]) {
        equal(safeUrl(bad, base), null, `${String(bad).slice(0, 30)}:`);
    }
    equal(safeUrl('relative', 'javascript:alert(1)'), null, 'a javascript: base:');
    assert(safeUrl('data:image/png;base64,AAAA', base, { image: true }), 'data:image/png for images');
    equal(safeUrl('data:image/png;base64,AAAA', base), null, 'but not for links:');
    equal(safeUrl('data:image/svg+xml;base64,AAAA', base, { image: true }), null, 'no SVG data:');
});

test('feed addresses: case of the path is kept, junk refused', () => {
    equal(normalizeFeedUrl('https://www.YouTube.com/feeds/videos.xml?channel_id=UCxAbC#x'), 'https://www.youtube.com/feeds/videos.xml?channel_id=UCxAbC');
    equal(normalizeFeedUrl('example.com/feed'), 'https://example.com/feed');
    for (const bad of ['not a url', 'localhost', 'ftp://example.com/', 'javascript:alert(1)', 'https://user:pw@example.com/', 'https://exa mple.com/']) {
        equal(normalizeFeedUrl(bad), null, `${bad}:`);
    }
});

test('proxy templates', () => {
    equal(checkProxyTemplate('https://p.example/?url={url}'), { template: 'https://p.example/?url={url}' });
    equal(checkProxyTemplate('https://p.example/raw'), { template: 'https://p.example/raw?url={url}' });
    equal(checkProxyTemplate('https://p.example/?a=1'), { template: 'https://p.example/?a=1&url={url}' });
    equal(checkProxyTemplate('http://127.0.0.1:8787/?url={url}'), { template: 'http://127.0.0.1:8787/?url={url}' });
    for (const bad of ['', 'http://p.example/?url={url}', 'javascript:alert(1)//{url}', 'https://u:p@p.example/{url}', `https://p.example/${'a'.repeat(600)}`]) {
        assert(checkProxyTemplate(bad).error, `${bad.slice(0, 40)} must be refused`);
    }
});

test('textFromHtml', () => {
    equal(textFromHtml('<script>x()</script><b>A</b> &amp; <i>B</i>'), 'A & B');
    equal(textFromHtml('&lt;img src=x onerror=alert(1)&gt;'), '<img src=x onerror=alert(1)>');
});

// --- The evil feed --------------------------------------------------------------

const DANGEROUS = 'script, iframe, frame, object, embed, form, input, button, textarea, select, base, meta, link, style, svg, math, template, noscript, video, audio, source, body';

function inspect(root) {
    const problems = [];
    for (const el of root.querySelectorAll('*')) {
        for (const attr of el.attributes) {
            if (/^on/i.test(attr.name)) {
                problems.push(`${el.tagName} ${attr.name}`);
            }
            if (['style', 'srcset', 'srcdoc', 'formaction', 'action'].includes(attr.name)) {
                problems.push(`${el.tagName} ${attr.name}`);
            }
        }
    }
    for (const el of root.querySelectorAll('.post-content *')) {
        if (el.hasAttribute('id') || el.hasAttribute('name') || el.hasAttribute('class')) {
            problems.push(`${el.tagName} id/name/class in a post body`);
        }
        if (el.matches(DANGEROUS)) {
            problems.push(`${el.tagName} in a post body`);
        }
    }
    for (const a of root.querySelectorAll('a[href]')) {
        if (!/^https?:/.test(a.getAttribute('href'))) {
            problems.push(`a href=${a.getAttribute('href').slice(0, 40)}`);
        }
        if (a.closest('.post-content') && (a.target !== '_blank' || a.rel !== 'noopener noreferrer')) {
            problems.push('a link without target/rel');
        }
    }
    for (const img of root.querySelectorAll('img[src]')) {
        if (!/^(https?:|data:image\/(png|gif|jpe?g|webp|avif|bmp);)/.test(img.getAttribute('src'))) {
            problems.push(`img src=${img.getAttribute('src').slice(0, 40)}`);
        }
    }
    for (const title of root.querySelectorAll('.post-title')) {
        if (title.children.length) {
            problems.push('elements in a title');
        }
    }
    return problems;
}

async function renderFeed(feed) {
    const box = document.createElement('ol');
    document.body.append(box);
    for (const [i, item] of feed.items.entries()) {
        box.append(renderPost({ ...item, id: i + 1, isNew: true }, { feedBase: feed.about.link || 'https://evil.example/', open: true }));
    }
    await sleep(1500); // let images fail and events fire
    return box;
}

test('the evil feed: nothing runs, nothing dangerous stays', async () => {
    const feed = parseFeed(decodeFeed(new Uint8Array(await (await fetch('evil-feed.xml')).arrayBuffer()), ''), 'https://evil.example/feed');
    equal(feed.items.length, 5);
    equal([feed.about.image, feed.items[0].link, feed.items[0].thumbnail, feed.items[0].enclosure, feed.items[1].link, feed.items[1].thumbnail, feed.items[1].enclosure],
        ['', '', '', null, '', '', null], 'dangerous addresses are dropped by the parser:');
    assert(!feed.about.title.includes('<') || feed.about.title === textFromHtml(feed.about.title), 'channel title is text');
    const box = await renderFeed(feed);
    equal(window.__pwned, undefined, 'window.__pwned:');
    equal(inspect(box), [], 'problems:');
    const links = [...box.querySelectorAll('.post-content a')].map((a) => a.getAttribute('href'));
    assert(links.includes('https://evil.example/protocol-relative') && links.includes('https://evil.example/relative'), `relative links resolve against the feed: ${links}`);
    box.remove();
});

test('Trusted Types are enforced where the CSP of the app is', () => {
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        return 'skipped: no CSP on this page';
    }
    if (!window.trustedTypes) {
        return 'skipped: this browser has no Trusted Types';
    }
    let blocked = false;
    try {
        document.createElement('div').innerHTML = '<b>x</b>';
    } catch (error) {
        blocked = error instanceof TypeError;
    }
    assert(blocked, 'innerHTML with a string must throw');
    let refused = false;
    try {
        trustedTypes.createPolicy('anything-else', { createHTML: (s) => s });
    } catch {
        refused = true;
    }
    assert(refused, 'a policy not named in the CSP must be refused');
    return '';
});

test('sanitizePost returns a fragment, no string', () => {
    const fragment = sanitizePost('<p>ok</p><img src=x onerror=alert(1)>', 'https://example.com/');
    assert(fragment instanceof DocumentFragment, 'a DocumentFragment');
    equal(fragment.querySelector('img').getAttribute('src'), 'https://example.com/x');
});

// --- The database ---------------------------------------------------------------

function request(r) {
    return new Promise((resolve, reject) => {
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
}

// The schema of the Angular version (ngx-indexed-db, version 2) with its data.
async function createOldDatabase() {
    await request(indexedDB.deleteDatabase('Stupid-RSS-Reader'));
    const open = indexedDB.open('Stupid-RSS-Reader', 2);
    open.onupgradeneeded = () => {
        const dbase = open.result;
        const posts = dbase.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
        for (const name of ['title', 'feedId', 'pubDate', 'link', 'author', 'thumbnail', 'description', 'content', 'categories', 'enclosure', 'isNew']) {
            posts.createIndex(name, name, { unique: false });
        }
        posts.createIndex('guid', 'guid', { unique: true });
        const feeds = dbase.createObjectStore('feeds', { keyPath: 'id', autoIncrement: true });
        feeds.createIndex('url', 'url', { unique: true });
        for (const name of ['about', 'newCount', 'count', 'newPostIds', 'postIds']) {
            feeds.createIndex(name, name, { unique: false });
        }
        feeds.add({ url: 'https://old.example/feed', about: { title: 'Old', link: 'https://old.example/', image: '', description: '', author: '', url: 'https://old.example/feed' }, count: 2, newCount: 1 });
        posts.add({ feedId: 1, guid: 'old-1', title: 'Older', pubDate: '2021-03-01 10:00:00', link: 'https://old.example/1', content: '<p>a</p>', isNew: false, enclosure: {} });
        posts.add({ feedId: 1, guid: 'old-2', title: 'Newer', pubDate: '2021-03-02 10:00:00', link: 'https://old.example/2', content: '<p>b</p>', isNew: true, enclosure: { link: 'https://old.example/a.mp3', type: 'audio/mpeg', length: 5 } });
    };
    const dbase = await request(open);
    dbase.close();
}

test('IndexedDB: upgrade from the Angular version keeps the data', async () => {
    await createOldDatabase();
    const feeds = await db.getFeeds();
    equal(feeds.map((f) => [f.id, f.url, f.about.title, f.count, f.newCount]), [[1, 'https://old.example/feed', 'Old', 2, 1]]);
    const posts = await db.getPosts(1);
    equal(posts.map((p) => p.title), ['Newer', 'Older'], 'old dates sort:');
    const dbase = await db.openDb();
    const tx = dbase.transaction(['feeds', 'posts', 'settings']);
    equal([...tx.objectStore('feeds').indexNames], ['url']);
    equal([...tx.objectStore('posts').indexNames].sort(), ['feedGuid', 'feedId']);
    equal(dbase.version, 3);
});

test('IndexedDB: save, dedupe per feed, trim to 100, mark read', async () => {
    const { added: [feed] } = await db.addFeeds(['https://new.example/feed']);
    const item = (i) => ({ guid: `g${i}`, title: `t${i}`, link: `https://new.example/${i}`, pubDate: new Date(Date.UTC(2025, 0, 1, 0, i)).toISOString(), content: '' });
    let result = await db.savePosts(feed.id, { title: 'New' }, [item(1), item(2)]);
    equal([result.added, result.feed.count, result.feed.newCount], [2, 2, 2]);
    result = await db.savePosts(feed.id, { title: 'New' }, [item(2), item(3)]);
    equal([result.added, result.feed.count], [1, 3], 'known guids are skipped:');
    await db.savePosts(1, null, [{ ...item(1), guid: 'g1' }]);
    equal((await db.getPosts(1)).length, 3, 'the same guid in another feed is a separate post:');
    const many = Array.from({ length: 150 }, (_, i) => item(i + 10)).reverse();
    result = await db.savePosts(feed.id, { title: 'New' }, many);
    equal(result.feed.count, 100, 'trimmed:');
    const posts = await db.getPosts(feed.id);
    equal([posts[0].title, posts.at(-1).title], ['t159', 't60'], 'the newest 100 stay:');
    const read = await db.markRead(feed.id, [posts[0].id]);
    equal(read.newCount, 99);
    equal((await db.markRead(feed.id)).newCount, 0);
    equal((await db.addFeeds(['https://new.example/feed'])).existing, 1);
    await db.deleteFeed(feed.id);
    equal((await db.getPosts(feed.id)).length, 0);
});

test('IndexedDB: settings', async () => {
    equal(await db.getSetting('proxy', 'default'), 'default');
    await db.setSetting('proxy', 'https://p.example/?url={url}');
    equal(await db.getSetting('proxy', 'default'), 'https://p.example/?url={url}');
    await db.deleteSetting('proxy');
    equal(await db.getSetting('proxy', 'default'), 'default');
});

// --- An evil proxy (tests/evil_proxy.py on 127.0.0.1:8789) -------------------------

const EVIL = 'http://127.0.0.1:8789/?url={url}';

async function evilProxyRunning() {
    try {
        await fetch('http://127.0.0.1:8789/?url=x');
        return true;
    } catch {
        return false;
    }
}

test('evil proxy: its feed is sanitized like any other', async () => {
    if (!await evilProxyRunning()) {
        return 'skipped: tests/evil_proxy.py is not running';
    }
    const feed = await fetchFeed(EVIL, 'https://evil.example/feed');
    const box = await renderFeed(feed);
    equal(window.__pwned, undefined, 'window.__pwned:');
    equal(inspect(box), [], 'problems:');
    box.remove();
    return '';
});

test('evil proxy: error text is short plain text, huge answers stop at 5 MB', async () => {
    if (!await evilProxyRunning()) {
        return 'skipped: tests/evil_proxy.py is not running';
    }
    const failure = async (url) => {
        try {
            await fetchFeed(EVIL, url);
        } catch (error) {
            return error;
        }
        throw new Error(`${url} must fail`);
    };
    const error = await failure('https://error.example/');
    assert(error instanceof FetchError && error.status === 500 && error.detail.length <= 200, `error: ${error.status} ${error.detail.length}`);
    const started = performance.now();
    equal((await failure('https://huge.example/')).message, 'The feed is larger than 5 MB');
    assert(performance.now() - started < 10000, 'stops reading quickly');
    assert((await failure('https://page.example/')).message.startsWith('Could not read the feed'), 'an HTML page');
    await sleep(500);
    equal(window.__pwned, undefined, 'window.__pwned:');
    return '';
});

// --- Run ------------------------------------------------------------------------

function line(text, kind) {
    const row = document.createElement('div');
    row.className = kind;
    row.textContent = text;
    results.append(row);
}

(async () => {
    let passed = 0;
    for (const { name, fn } of tests) {
        try {
            const note = await fn();
            passed++;
            line(`PASS: ${name}${note ? ` (${note})` : ''}`, 'pass');
        } catch (error) {
            failed++;
            line(`FAIL: ${name}: ${error.message}`, 'fail');
        }
    }
    const summary = `RESULT: ${passed} passed, ${failed} failed`;
    line(summary, failed ? 'fail' : 'pass');
    document.title = failed ? 'FAIL' : 'PASS';
    document.body.dataset.done = '1';
})();
