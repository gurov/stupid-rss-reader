import {Component, OnInit} from '@angular/core';
import {debounceTime, map, switchMap, tap, toArray} from 'rxjs/operators';
import {NgxIndexedDBService} from 'ngx-indexed-db';
import {ActivatedRoute} from '@angular/router';
import {FeedItem, Post, SiteFeedAbout} from '../models';
import {concat} from 'rxjs';
import {MAX_POSTS_COUNT, TABLES} from '../constants';


@Component({
    selector: 'app-feed',
    templateUrl: './feed.component.html',
    styles: [`

    `]
})
export class FeedComponent implements OnInit {

    posts: Post[] = [];
    about: SiteFeedAbout = new SiteFeedAbout();
    private feedId: number;

    constructor(private db: NgxIndexedDBService,
                private route: ActivatedRoute) {
    }

    markAsRead(): void {
        const newPosts$ = this.posts.filter(p => p.isNew)
            .map(post => this.db.update(TABLES.POSTS, { ...post, isNew: false }));

        concat(...newPosts$).pipe(toArray()).subscribe();
    }

    deleteTail() {
        const postForDelete$ = this.posts.slice(MAX_POSTS_COUNT)
            .map(post => this.db.delete(TABLES.POSTS, post.id));

        concat(...postForDelete$).pipe(toArray()).subscribe();

    }

    ngOnInit(): void {
        this.route.params
            .pipe(
                map(params => params.id),
                tap(id => this.feedId = +id),
                switchMap(id => this.db.getByID(TABLES.FEEDS, +id)),
                tap((feed: FeedItem) => this.about = feed.about),
                switchMap(feed => this.db.getAllByIndex(TABLES.POSTS, 'feedId', IDBKeyRange.only(this.feedId))),
                tap((posts) => this.posts = posts?.reverse() || []),
                debounceTime(200),
                tap(() => this.markAsRead()),
                debounceTime(200),
                tap(() => this.deleteTail())
            )
            .subscribe();
    }


}
