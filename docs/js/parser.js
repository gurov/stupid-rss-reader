// RSS 2.0, Atom and RSS 1.0 (RDF) → { format, about, items }.
// The feed is hostile input: every field is limited in size, every address goes
// through safeUrl(), titles become plain text. XXE is impossible in a browser.

import { parseInert, safeUrl, textFromHtml } from './sanitize.js';

export const MAX_ENTRIES = 200;
const MAX_TITLE = 1024;
const MAX_TEXT = 2048;
const MAX_AUTHOR = 256;
const MAX_GUID = 1024;
const MAX_CONTENT = 512 * 1024;
const MAX_CATEGORIES = 20;
const MAX_CATEGORY = 100;
const MAX_URL = 2048;

const NS = {
    atom: ['http://www.w3.org/2005/Atom', 'http://purl.org/atom/ns#'],
    content: ['http://purl.org/rss/1.0/modules/content/'],
    dc: ['http://purl.org/dc/elements/1.1/'],
    media: ['http://search.yahoo.com/mrss/', 'http://search.yahoo.com/mrss'],
    itunes: ['http://www.itunes.com/dtds/podcast-1.0.dtd'],
    // RSS 0.9x and 2.0 elements have no namespace, RSS 1.0 ones have their own.
    plain: [null, '', 'http://purl.org/rss/1.0/', 'http://my.netscape.com/rdf/simple/0.9/'],
};

export class FeedParseError extends Error {}

function kids(el, name, ns = NS.plain) {
    if (!el) {
        return [];
    }
    return Array.from(el.children).filter((c) => c.localName === name && ns.includes(c.namespaceURI));
}

function kid(el, name, ns) {
    return kids(el, name, ns)[0] || null;
}

function text(el) {
    return el ? el.textContent.trim() : '';
}

function limit(value, max) {
    return value.length > max ? value.slice(0, max) : value;
}

function url(raw, base, options) {
    const value = safeUrl(raw, base, options);
    return value && value.length <= MAX_URL ? value : '';
}

function escapeHtml(value) {
    return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Plain text (YouTube descriptions, Atom type="text") → HTML with clickable links.
// The result goes through DOMPurify and safeUrl() like any other post body.
function textToHtml(value) {
    return escapeHtml(value)
        .replace(/https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)\]]/g, (link) => `<a href="${link}">${link}</a>`)
        .replace(/\n/g, '<br>');
}

// An Atom text construct (title, summary, content) → HTML.
function atomHtml(el) {
    if (!el) {
        return '';
    }
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'xhtml') {
        const serializer = new XMLSerializer();
        const div = kid(el, 'div', ['http://www.w3.org/1999/xhtml']);
        const nodes = div ? div.childNodes : el.childNodes;
        return Array.from(nodes, (node) => serializer.serializeToString(node)).join('');
    }
    if (type === 'html' || type === 'text/html') {
        return el.textContent;
    }
    return textToHtml(el.textContent);
}

// An Atom text construct → plain text.
function atomText(el, max) {
    if (!el) {
        return '';
    }
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    const value = type === 'text' ? el.textContent.replace(/\s+/g, ' ').trim() : textFromHtml(atomHtml(el), max);
    return limit(value, max);
}

// RSS titles are plain text by the spec, but many feeds put escaped HTML there.
function rssText(el, max) {
    return textFromHtml(text(el), max);
}

// RSS <author> is "email (Name)" by the spec: show the name.
function rssAuthor(el) {
    const value = rssText(el, MAX_AUTHOR);
    return /^\S+@\S+\s+\((.+)\)$/.exec(value)?.[1].trim() || value;
}

const ZONES = { UT: '+0000', GMT: '+0000', Z: '+0000', EST: '-0500', EDT: '-0400', CST: '-0600',
    CDT: '-0500', MST: '-0700', MDT: '-0600', PST: '-0800', PDT: '-0700', MSK: '+0300', CET: '+0100',
    CEST: '+0200', BST: '+0100', IST: '+0530', JST: '+0900' };

// RFC 822 or ISO 8601 → ISO 8601 in UTC, '' if unknown.
export function parseDate(value) {
    const raw = (value || '').trim();
    if (!raw) {
        return '';
    }
    let time = Date.parse(raw);
    if (Number.isNaN(time)) {
        const fixed = raw
            .replace(/^[A-Za-z]{2,9},?\s*/, '')
            .replace(/\b([A-Z]{1,4})$/, (zone) => ZONES[zone] || zone);
        time = Date.parse(fixed);
    }
    if (Number.isNaN(time) || time < Date.UTC(1990, 0, 1)) {
        return '';
    }
    return new Date(time).toISOString();
}

// FNV-1a: an id for an entry that has neither guid nor link.
function hash(value) {
    let h = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
}

function mediaThumbnail(el, base) {
    const groups = [el, ...kids(el, 'group', NS.media)];
    for (const group of groups) {
        for (const thumb of kids(group, 'thumbnail', NS.media)) {
            const value = url(thumb.getAttribute('url'), base, { image: true });
            if (value) {
                return value;
            }
        }
    }
    for (const group of groups) {
        for (const media of kids(group, 'content', NS.media)) {
            const medium = media.getAttribute('medium') || '';
            const type = media.getAttribute('type') || '';
            if (medium === 'image' || type.startsWith('image/')) {
                const value = url(media.getAttribute('url'), base, { image: true });
                if (value) {
                    return value;
                }
            }
        }
    }
    const itunes = kid(el, 'image', NS.itunes);
    return itunes ? url(itunes.getAttribute('href'), base, { image: true }) : '';
}

function mediaDescription(el) {
    const node = kid(el, 'description', NS.media) || kid(kid(el, 'group', NS.media), 'description', NS.media);
    return node ? textToHtml(text(node)) : '';
}

function enclosure(rawUrl, type, length, base) {
    const value = url(rawUrl, base);
    if (!value) {
        return null;
    }
    const size = Number.parseInt(length, 10);
    return {
        url: value,
        type: limit((type || '').trim(), 100),
        length: Number.isFinite(size) && size > 0 ? size : 0,
    };
}

function categories(nodes, read) {
    const result = [];
    for (const node of nodes) {
        const value = limit(read(node).replace(/\s+/g, ' ').trim(), MAX_CATEGORY);
        if (value && !result.includes(value)) {
            result.push(value);
        }
        if (result.length >= MAX_CATEGORIES) {
            break;
        }
    }
    return result;
}

function finish(item) {
    const content = limit(item.content || '', MAX_CONTENT);
    const guid = limit(item.guid || item.link || `h:${hash(`${item.title}|${item.pubDate}|${content.slice(0, 500)}`)}`, MAX_GUID);
    return { ...item, guid, content };
}

function atomLink(el, rel, base) {
    for (const link of kids(el, 'link', NS.atom)) {
        const linkRel = link.getAttribute('rel') || 'alternate';
        if (linkRel === rel) {
            const value = url(link.getAttribute('href'), base);
            if (value) {
                return { href: value, type: link.getAttribute('type'), length: link.getAttribute('length') };
            }
        }
    }
    return null;
}

function parseAtom(root, feedUrl) {
    const feedLink = atomLink(root, 'alternate', feedUrl)?.href || '';
    const base = feedLink || feedUrl;
    const logo = kid(root, 'logo', NS.atom) || kid(root, 'icon', NS.atom);
    const about = {
        title: atomText(kid(root, 'title', NS.atom), MAX_TITLE),
        link: feedLink,
        description: atomText(kid(root, 'subtitle', NS.atom), MAX_TEXT),
        image: url(text(logo), base, { image: true }),
        author: limit(text(kid(kid(root, 'author', NS.atom), 'name', NS.atom)), MAX_AUTHOR),
    };
    const items = kids(root, 'entry', NS.atom).slice(0, MAX_ENTRIES).map((entry) => {
        const link = atomLink(entry, 'alternate', base)?.href || '';
        const enclosureLink = atomLink(entry, 'enclosure', link || base);
        return finish({
            title: atomText(kid(entry, 'title', NS.atom), MAX_TITLE),
            link,
            guid: text(kid(entry, 'id', NS.atom)),
            pubDate: parseDate(text(kid(entry, 'published', NS.atom)) || text(kid(entry, 'updated', NS.atom))),
            author: limit(text(kid(kid(entry, 'author', NS.atom), 'name', NS.atom)) || about.author, MAX_AUTHOR),
            content: atomHtml(kid(entry, 'content', NS.atom)) || atomHtml(kid(entry, 'summary', NS.atom))
                || mediaDescription(entry),
            categories: categories(kids(entry, 'category', NS.atom),
                (node) => node.getAttribute('label') || node.getAttribute('term') || ''),
            thumbnail: mediaThumbnail(entry, link || base),
            enclosure: enclosureLink
                ? enclosure(enclosureLink.href, enclosureLink.type, enclosureLink.length, link || base) : null,
        });
    });
    return { format: 'Atom', about, items };
}

function parseRssItem(item, base, fallbackAuthor) {
    const guidNode = kid(item, 'guid');
    const guid = text(guidNode);
    const permalink = guidNode && guidNode.getAttribute('isPermaLink') !== 'false' ? guid : '';
    const link = url(text(kid(item, 'link')) || permalink, base);
    const encl = kid(item, 'enclosure');
    return finish({
        title: rssText(kid(item, 'title'), MAX_TITLE),
        link,
        guid,
        pubDate: parseDate(text(kid(item, 'pubDate')) || text(kid(item, 'date', NS.dc))),
        author: limit(rssText(kid(item, 'creator', NS.dc), MAX_AUTHOR) || rssAuthor(kid(item, 'author'))
            || fallbackAuthor, MAX_AUTHOR),
        content: text(kid(item, 'encoded', NS.content)) || text(kid(item, 'description')) || mediaDescription(item),
        categories: categories(kids(item, 'category').concat(kids(item, 'subject', NS.dc)), (node) => node.textContent),
        thumbnail: mediaThumbnail(item, link || base),
        enclosure: encl ? enclosure(encl.getAttribute('url'), encl.getAttribute('type'), encl.getAttribute('length'), link || base) : null,
    });
}

function parseRss(root, feedUrl, format) {
    const channel = kid(root, 'channel');
    if (!channel) {
        throw new FeedParseError('No <channel> in the feed');
    }
    const channelLink = url(text(kid(channel, 'link')), feedUrl);
    const base = channelLink || feedUrl;
    const imageNode = kid(channel, 'image') || kid(root, 'image');
    const itunesImage = kid(channel, 'image', NS.itunes);
    const about = {
        title: rssText(kid(channel, 'title'), MAX_TITLE),
        link: channelLink,
        description: rssText(kid(channel, 'description'), MAX_TEXT),
        image: url(text(kid(imageNode, 'url')), base, { image: true })
            || url(itunesImage?.getAttribute('href'), base, { image: true }),
        author: limit(rssText(kid(channel, 'creator', NS.dc), MAX_AUTHOR)
            || rssAuthor(kid(channel, 'managingEditor')), MAX_AUTHOR),
    };
    // RSS 2.0: items inside <channel>; RSS 1.0: next to it.
    const itemNodes = format === 'RSS 1.0' ? kids(root, 'item') : kids(channel, 'item');
    const items = itemNodes.slice(0, MAX_ENTRIES).map((item) => parseRssItem(item, base, about.author));
    return { format, about, items };
}

export function parseFeed(xml, feedUrl) {
    const doc = parseInert(xml, 'application/xml');
    if (doc.getElementsByTagNameNS('*', 'parsererror').length) {
        throw new FeedParseError('The feed is not valid XML');
    }
    const root = doc.documentElement;
    if (root.localName === 'rss') {
        return parseRss(root, feedUrl, 'RSS 2.0');
    }
    if (root.localName === 'feed' && NS.atom.includes(root.namespaceURI)) {
        return parseAtom(root, feedUrl);
    }
    if (root.localName === 'RDF') {
        return parseRss(root, feedUrl, 'RSS 1.0');
    }
    throw new FeedParseError('This is not an RSS or Atom feed');
}
