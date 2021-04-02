import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, concat, Observable, of, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, delay, map, switchMap, tap, toArray } from 'rxjs/operators';
import { FeedError, FeedItem, FeedLoading, Post, SiteFeed, SiteFeedAbout } from './models';
import { RSS2JSON, TABLES } from './constants';
import { NgxIndexedDBService } from 'ngx-indexed-db';


@Injectable({
    providedIn: 'root'
})
export class CoreService {

    feedLoading$ = new BehaviorSubject<FeedLoading>({});
    feedError$ = new BehaviorSubject<FeedError>({});

    constructor(private http: HttpClient, private dbService: NgxIndexedDBService) {
    }

    setFeedLoading(id: number, isLoadind: boolean) {
        const feedLoading = this.feedLoading$.getValue();
        this.feedLoading$.next({...feedLoading, [id]: isLoadind});
    }

    setFeedError(id: number, isLoadind: string) {
        const feedError = this.feedError$.getValue();
        this.feedError$.next({...feedError, [id]: isLoadind});
    }

    updateFeed(url: string, id: number, about: SiteFeedAbout): void {
        this.dbService.update(TABLES.FEEDS, { url, id, about });
    }

    addPosts(posts: Post[], feedId: number, url: string, about: SiteFeedAbout): void {
        const add$ = (post: Post): Observable<number> => this.dbService
            .add(TABLES.POSTS, { ...post, feedId, isNew: true })
            .pipe(catchError(() => of(-1)));

        combineLatest(posts.map(add$))
            .pipe(
                switchMap(() => this.dbService.getAllByIndex(TABLES.POSTS, 'feedId', IDBKeyRange.only(feedId))),
                map(posts => [posts.length, posts.filter(p => p.isNew).length]),
                map(([count, newCount]) => ({ url, id: feedId, about, count, newCount } as FeedItem))
            )
            .subscribe(feedItem => this.dbService.update(TABLES.FEEDS, feedItem));
    }

    getNewPostsAndUpdateStore(url: string, id: number): Observable<SiteFeed> {

        this.setFeedLoading(id, true);

        return this.http.get<SiteFeed>(encodeURI(`${RSS2JSON}${url}`))
            .pipe(
                tap(siteFeed => {
                    this.addPosts(siteFeed.items.reverse(), id, url, siteFeed.feed);
                    this.setFeedLoading(id, false);
                }),
                catchError(error => {
                    this.setFeedLoading(id, false);
                    this.setFeedError(id, error.message || 'Error');
                    return of(null);
                })
            );
    }

    refreshFeeds(feedItems: FeedItem[]): Observable<SiteFeed[]> {
        const requests$ = feedItems
            .map(feedItem => this.getNewPostsAndUpdateStore(feedItem.url, feedItem.id));

        return combineLatest(requests$);
    }


}
