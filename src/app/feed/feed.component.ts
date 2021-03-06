import {Component, OnInit} from '@angular/core';
import {debounceTime, map, switchMap, tap, toArray} from 'rxjs/operators';
import {NgxIndexedDBService} from 'ngx-indexed-db';
import {ActivatedRoute, Router} from '@angular/router';
import {FeedItem, Post, SiteFeedAbout} from '../models';
import {concat} from 'rxjs';
import {MAX_POSTS_COUNT, TABLES} from '../constants';


@Component({
    selector: 'app-feed',
    templateUrl: './feed.component.html',
    styles: [`
        .active-actions {
            background-color: rgba(255, 255, 255, 0.7);
        }
    `]
})
export class FeedComponent implements OnInit {

    posts: Post[] = [];
    displayActions = false;
    about: SiteFeedAbout = new SiteFeedAbout();
    private feedId: number;

    constructor(private db: NgxIndexedDBService,
                private router: Router,
                private route: ActivatedRoute) {
    }

    markAsRead(): void {
        const newPosts$ = this.posts.filter(p => p.isNew)
            .map(post => this.db.update(TABLES.POSTS, {...post, isNew: false}));

        concat(...newPosts$).pipe(toArray()).subscribe();
    }

    deleteTail(): void {
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

    deleteFeed(): void {
        const result = confirm('Remove the feed?');
        if (result === true) {

            const forDelete$ = [
                this.db.delete(TABLES.FEEDS, this.feedId),
                ...this.posts.map(post => this.db.delete(TABLES.POSTS, post.id))
            ];
            concat(...forDelete$).pipe(toArray())
                .subscribe(() => this.router.navigate(['/']));
        }
    }

    removeAllPosts(): void {
        const result = confirm('Remove all the posts?');
        if (result === true) {
            const postForDelete$ = this.posts
                .map(post => this.db.delete(TABLES.POSTS, post.id));
            concat(...postForDelete$).pipe(toArray())
                .subscribe(() => this.ngOnInit());
        }
    }

}
