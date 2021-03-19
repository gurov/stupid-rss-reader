import {Injectable} from '@angular/core';
import {concat, Observable, of, Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {catchError, delay, switchMap, tap, toArray} from 'rxjs/operators';
import {FeedItem, Post, SiteFeed, SiteFeedAbout} from './models';
import {RSS2JSON, TABLES} from './constants';
import {NgxIndexedDBService} from 'ngx-indexed-db';


@Injectable({
    providedIn: 'root'
})
export class CoreService {


    feedLoading$ = new Subject<[id: number, isLoading: boolean]>();
    feedError$ = new Subject<[id: number, message: string]>();

    constructor(private http: HttpClient, private ngxIndexedDBService: NgxIndexedDBService) {
    }

    updateFeed(url: string, id: number, about: SiteFeedAbout): void {
        this.ngxIndexedDBService.update(TABLES.FEEDS, {url, id, about});
    }

    addPosts(posts: Post[], feedId: number): void {
        posts.forEach((post) => {
            this.ngxIndexedDBService
                .add(TABLES.POSTS, {...post, feedId, isNew: true})
                .subscribe();
        });
    }

    getNewPostsAndUpdateStore(url: string, id: number): Observable<SiteFeed> {

        return of(url).pipe(
            delay(100),
            tap((url) => this.feedLoading$.next([id, true])),
            switchMap(url => this.http.get<SiteFeed>(encodeURI(`${RSS2JSON}${url}`))),
            tap((siteFeed) => {
                this.updateFeed(url, id, siteFeed.feed);
                this.addPosts(siteFeed.items.reverse(), id);
                this.feedLoading$.next([id, false]);
            }),
            catchError((error) => {
                this.feedLoading$.next([id, false]);
                this.feedError$.next([id, error.message || 'Error']);
                return of(null);
            })
        );
    }

    refreshFeeds(feedItems: FeedItem[]): Observable<SiteFeed[]> {
        const requests$ = feedItems
            .map(feedItem => this.getNewPostsAndUpdateStore(feedItem.url, feedItem.id));

        return concat(...requests$).pipe(toArray());
    }


}
