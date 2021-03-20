import {Component, OnDestroy, OnInit} from '@angular/core';
import {NgxIndexedDBService} from 'ngx-indexed-db';
import {combineLatest, Subject} from 'rxjs';
import {isValidHttpUrl} from '../helpers';
import {FeedItem} from '../models';
import {TABLES} from '../constants';
import {CoreService} from '../core.service';
import {takeUntil} from 'rxjs/operators';
import {importFeedsFromVersion3} from '../backward-compatibility';


@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styles: []
})
export class HomeComponent implements OnInit, OnDestroy {

    feeds: FeedItem[] = [];
    addFeedMode: boolean = false;
    godMode: boolean = false;
    rawFeedURLs: string = '';
    feedLoading: { [index: number]: boolean } = {};
    feedError: { [index: number]: string } = {};
    loading: boolean = false;
    private ngUnsubscribe$ = new Subject<void>();

    identify = (index: number, feed: FeedItem) => feed.id;

    constructor(private dbService: NgxIndexedDBService,
                private coreService: CoreService) {
    }

    get shareIsSuported(): boolean {
        return !!navigator.share;
    }

    addFeeds(rawFeedStrings: string): void {
        this.addFeedMode = false;
        this.rawFeedURLs = '';
        const newFeeds$ = rawFeedStrings
            .split('\n')
            .map(s => s.trim())
            .filter(s => s)
            .filter(s => isValidHttpUrl(s))
            .map(url => this.dbService.add(TABLES.FEEDS, {url}));

        combineLatest(newFeeds$)
            .subscribe(() => this.load());
    }

    refreshFeeds(): void {
        this.loading = true;
        this.feedError = {};
        this.coreService.refreshFeeds(this.feeds)
            .subscribe(() => {
                this.loading = false;
                this.load();
            });
    }

    share(): void {
        navigator.share?.({
            title: 'Stupid RSS',
            text: this.feeds.map(f => f.url).join(' \n'),
            url: location.href,
        }); // share the URL of MDN
    }

    load(): void {
        this.dbService.getAll(TABLES.FEEDS)
            .subscribe(feeds => this.feeds = feeds);
    }

    ngOnInit(): void {
        this.coreService.feedLoading$
            .pipe(takeUntil(this.ngUnsubscribe$))
            .subscribe(([id, isLoadind]) => this.feedLoading[id] = isLoadind);

        this.coreService.feedError$
            .pipe(takeUntil(this.ngUnsubscribe$))
            .subscribe(([id, message]) => this.feedError[id] = message);

        this.load();

        // import from the old version
        try {
            this.addFeeds(importFeedsFromVersion3());
        } catch (error) {
        }


    }

    unregister(): void {
        const result = confirm('Unregister the Service Worker?');
        if (result === true) {
            navigator.serviceWorker?.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister();
                }
            });
        }
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe$.next();
        this.ngUnsubscribe$.complete();
    }


}
