import {Injectable} from '@angular/core';
import {concat, Observable, Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {tap, toArray} from 'rxjs/operators';
import {FeedItem, Post, SiteFeed, SiteFeedAbout} from './models';
import {RSS2JSON, TABLES} from './constants';
import {NgxIndexedDBService} from 'ngx-indexed-db';


@Injectable({
    providedIn: 'root'
})
export class CoreService {


    feedLoading$ = new Subject<[id: number, isLoading: boolean]>();

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
        this.feedLoading$.next([id, true]);
        const t = Math.floor(+(new Date())/(1000 * 60 * 15));
        return this.http.get<SiteFeed>(encodeURI(`${RSS2JSON}${url}&${t}`))
            .pipe(tap((siteFeed) => {

                this.updateFeed(url, id, siteFeed.feed);
                this.addPosts(siteFeed.items.reverse(), id);

                this.feedLoading$.next([id, false]);
            }));
    }

    refreshFeeds(feedItems: FeedItem[]): Observable<SiteFeed[]> {
        const requests$ = feedItems
            .map(feedItem => this.getNewPostsAndUpdateStore(feedItem.url, feedItem.id));

        return concat(...requests$).pipe(toArray());
    }


}
