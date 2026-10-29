// IndexedDB: the same database as the Angular version (v1, v2), upgraded to v3.
//   feeds    { id, url, about: { title, link, description, image, author }, count, newCount, updatedAt }
//   posts    { id, feedId, guid, title, link, pubDate, author, content, categories, thumbnail,
//              enclosure: { url, type, length }, isNew }
//            Posts from rss2json also have description and enclosure.link/thumbnail.
//   settings { key, value }  — not localStorage: the service worker needs the proxy too.

import { toTime } from './dom.js';

const NAME = 'Stupid-RSS-Reader';
const VERSION = 3;
export const MAX_POSTS_PER_FEED = 100;

let opening = null;
const listeners = new Set();

// 'blocked': an old tab keeps the previous version open; 'closed': another tab has
// upgraded the database and this one must reload.
export function onDbEvent(listener) {
    listeners.add(listener);
}

function emit(type) {
    listeners.forEach((listener) => listener(type));
}

function keepIndexes(store, wanted) {
    for (const name of Array.from(store.indexNames)) {
        if (!(name in wanted)) {
            store.deleteIndex(name);
        }
    }
    for (const [name, [keyPath, options]] of Object.entries(wanted)) {
        if (!store.indexNames.contains(name)) {
            store.createIndex(name, keyPath, options);
        }
    }
}

function upgrade(db, transaction) {
    const store = (name, options) => (db.objectStoreNames.contains(name)
        ? transaction.objectStore(name) : db.createObjectStore(name, options));
    const feeds = store('feeds', { keyPath: 'id', autoIncrement: true });
    const posts = store('posts', { keyPath: 'id', autoIncrement: true });
    store('settings', { keyPath: 'key' });
    // v1/v2 indexed every field of a post, copying all their text. Only these stay.
    // Duplicates are checked per feed now: the old global unique guid index did not
    // let two feeds have the same post.
    keepIndexes(feeds, { url: ['url', { unique: true }] });
    keepIndexes(posts, {
        feedId: ['feedId', { unique: false }],
        feedGuid: [['feedId', 'guid'], { unique: true }],
    });
}

export function openDb() {
    if (!opening) {
        opening = new Promise((resolve, reject) => {
            const request = indexedDB.open(NAME, VERSION);
            request.onupgradeneeded = () => upgrade(request.result, request.transaction);
            request.onblocked = () => emit('blocked');
            request.onerror = () => {
                opening = null;
                reject(request.error);
            };
            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    opening = null;
                    emit('closed');
                };
                emit('open');
                resolve(db);
            };
        });
    }
    return opening;
}

function done(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Runs fn(stores) in one transaction and resolves with its result when it commits.
async function run(names, mode, fn) {
    const db = await openDb();
    const transaction = db.transaction(names, mode);
    const stores = Object.fromEntries([].concat(names).map((name) => [name, transaction.objectStore(name)]));
    const committed = new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
    });
    let result;
    try {
        result = await fn(stores);
    } catch (error) {
        try {
            transaction.abort();
        } catch {
            // already finished
        }
        throw error;
    }
    await committed;
    return result;
}

export function sortPosts(posts) {
    const time = (post) => {
        const value = toTime(post.pubDate);
        return Number.isNaN(value) ? -Infinity : value;
    };
    return posts.sort((a, b) => time(b) - time(a) || b.id - a.id);
}

async function feedPosts(posts, feedId) {
    return sortPosts(await done(posts.index('feedId').getAll(IDBKeyRange.only(feedId))));
}

async function recount(stores, feedId, changes = {}) {
    const feed = await done(stores.feeds.get(feedId));
    if (!feed) {
        return null;
    }
    const list = await done(stores.posts.index('feedId').getAll(IDBKeyRange.only(feedId)));
    const updated = { ...feed, ...changes, count: list.length, newCount: list.filter((p) => p.isNew).length };
    await done(stores.feeds.put(updated));
    return updated;
}

export async function getFeeds() {
    return run('feeds', 'readonly', ({ feeds }) => done(feeds.getAll()));
}

export async function getFeed(id) {
    return run('feeds', 'readonly', ({ feeds }) => done(feeds.get(id)));
}

// urls: already checked and normalized. → { added: [feed], existing: number }
export async function addFeeds(urls) {
    return run('feeds', 'readwrite', async ({ feeds }) => {
        const added = [];
        let existing = 0;
        for (const url of urls) {
            if (await done(feeds.index('url').getKey(url)) !== undefined) {
                existing++;
                continue;
            }
            const feed = { url, about: null, count: 0, newCount: 0 };
            feed.id = await done(feeds.add(feed));
            added.push(feed);
        }
        return { added, existing };
    });
}

export async function deleteFeed(id) {
    return run(['feeds', 'posts'], 'readwrite', async ({ feeds, posts }) => {
        const keys = await done(posts.index('feedId').getAllKeys(IDBKeyRange.only(id)));
        await Promise.all(keys.map((key) => done(posts.delete(key))));
        await done(feeds.delete(id));
    });
}

export async function getPosts(feedId) {
    return run('posts', 'readonly', ({ posts }) => feedPosts(posts, feedId));
}

export async function deletePosts(feedId) {
    return run(['feeds', 'posts'], 'readwrite', async (stores) => {
        const keys = await done(stores.posts.index('feedId').getAllKeys(IDBKeyRange.only(feedId)));
        await Promise.all(keys.map((key) => done(stores.posts.delete(key))));
        return recount(stores, feedId);
    });
}

// Saves fresh entries of a feed: new ones get isNew, known ones are left as they are.
// Then only the latest MAX_POSTS_PER_FEED posts stay. → { feed, added }
export async function savePosts(feedId, about, items) {
    return run(['feeds', 'posts'], 'readwrite', async (stores) => {
        const index = stores.posts.index('feedGuid');
        let added = 0;
        // Oldest first: posts without dates keep the order of the feed by id.
        for (const item of items.slice(0, MAX_POSTS_PER_FEED).reverse()) {
            if (await done(index.getKey([feedId, item.guid])) === undefined) {
                await done(stores.posts.add({ ...item, feedId, isNew: true }));
                added++;
            }
        }
        const list = await feedPosts(stores.posts, feedId);
        await Promise.all(list.slice(MAX_POSTS_PER_FEED).map((post) => done(stores.posts.delete(post.id))));
        const feed = await recount(stores, feedId, { about, updatedAt: new Date().toISOString() });
        return { feed, added };
    });
}

// Marks the given posts (or all of the feed) as read. → the updated feed
export async function markRead(feedId, postIds = null) {
    return run(['feeds', 'posts'], 'readwrite', async (stores) => {
        const list = await done(stores.posts.index('feedId').getAll(IDBKeyRange.only(feedId)));
        const ids = postIds && new Set(postIds);
        await Promise.all(list
            .filter((post) => post.isNew && (!ids || ids.has(post.id)))
            .map((post) => done(stores.posts.put({ ...post, isNew: false }))));
        return recount(stores, feedId);
    });
}

export async function getSetting(key, fallback) {
    const row = await run('settings', 'readonly', ({ settings }) => done(settings.get(key)));
    return row ? row.value : fallback;
}

export async function setSetting(key, value) {
    return run('settings', 'readwrite', ({ settings }) => done(settings.put({ key, value })));
}

export async function deleteSetting(key) {
    return run('settings', 'readwrite', ({ settings }) => done(settings.delete(key)));
}

export async function deleteDatabase() {
    const db = await opening;
    db?.close();
    opening = null;
    await done(indexedDB.deleteDatabase(NAME));
}
