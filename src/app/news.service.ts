import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { map } from 'rxjs/operators';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { Feed, Post } from './models';
import * as Parser from 'rss-parser';
import 'rxjs/add/operator/do';
import 'rxjs/add/observable/throw';

const PROXY = 'https://crossorigin.me/';
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

@Injectable()
export class NewsService {

    store: Feed[] = [];
    private parser = new Parser();

    constructor() {
        const storeString = localStorage.getItem('store');
        try {
            this.store = JSON.parse(storeString) || [];
        } catch (error) {
        }
    }

    getFeed(url: string) {
        return this.store.find(feed => feed.url === url) || new Feed();
    }

    getNewPostsAndUpdate(url: string): Observable<Post[]> {
        return this.get(url)
            .pipe(map(feed => {

                const newItems = this.filterOldPosts(feed.items);
                const oldItems = this.filterOldPosts(this.getFeed(url).items);

                const oldIsoDates = oldItems.map(post => post.isoDate);
                const newPosts = newItems.filter(post => !oldIsoDates.includes(post.isoDate))

                this.updateFeed(url, [...newPosts, ...oldItems]);
                return newPosts;

            }));
    }

    filterOldPosts(posts: Post[]): Post[] {
        const days = +localStorage.getItem('days') || 14;
        const t = days * 24 * 3600 * 1000;
        return posts.filter(post => +new Date() - Date.parse(post.isoDate) < t);
    }

    get(url: string): Observable<Feed> {

        const corsProxy = localStorage.getItem('cors') || 'cors2';
        const proxyUrl = corsProxy === 'cors1' ? PROXY : CORS_PROXY;

        return fromPromise(this.parser.parseURL(proxyUrl + url))
            .pipe(map(feed => <Feed>Object.assign(feed, {url})));
    }

    add(url: string): Observable<Feed> {
        const a = this.store.find(f => f.url === url);
        if (!a) {
            return this.get(url).do(feed => {
                this.store.push(feed);
                localStorage.setItem('store', JSON.stringify(this.store));
            });
        }
        return Observable.throw('Error: The feed exist');

    }

    private updateFeed(url: string, posts: Post[]) {
        this.store.forEach((feed, index) => {
            if (feed.url === url) {
                const freshFeed = new Feed();
                freshFeed.url = url;
                freshFeed.items = posts;
                freshFeed.contentSnippet = feed.contentSnippet;
                this.store[index] = freshFeed;
            }
        });
        localStorage.setItem('store', JSON.stringify(this.store));
    }

    deleteFeed(url: string) {
        this.store = this.store.filter(feed => feed.url !== url);
        localStorage.setItem('store', JSON.stringify(this.store));
    }

    changeContentView(url: string, showContentSnippet: boolean) {
        this.store.forEach((feed, index) => {
            if (feed.url === url) {
                this.store[index].contentSnippet = showContentSnippet;
            }
        });
        localStorage.setItem('store', JSON.stringify(this.store));
    }

}
