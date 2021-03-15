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
    rawFeedURLs: string= '';
    feedLoading: {[index: number]: boolean} = {};
    loading: boolean = false;
    private ngUnsubscribe$ = new Subject<void>();

    identify = (index: number, feed: FeedItem) => feed.id;


    constructor(private ngxIndexedDBService: NgxIndexedDBService,
        private coreService: CoreService) {

    }

    get shareIsSuported(): boolean {
        return !!navigator.share;
    }

    addFeeds(rawFeedStrings: string): void {
        this.addFeedMode = false;
        const newFeeds$ = rawFeedStrings
            .split('\n')
            .map(s => s.trim())
            .filter(s => s)
            .filter(s => isValidHttpUrl(s))
            .map(url => this.ngxIndexedDBService.add(TABLES.FEEDS, {url}));

        combineLatest(newFeeds$)
            .subscribe(() => this.load());
    }

    refreshFeeds(): void {
        this.loading = true;
        this.coreService.refreshFeeds(this.feeds)
            .subscribe(() => {
                this.loading = false;
                this.load();
            });
    }

    share(): void {
        if (navigator['share']) {
          navigator['share']({
            title: 'Stupid RSS',
            text: this.feeds.map(f => f.url).join(' \n'),
            url: location.href,
          }); // share the URL of MDN
        }
    }

    load(): void {
        this.ngxIndexedDBService.getAll(TABLES.FEEDS)
            .subscribe(feeds => this.feeds = feeds);
    }

    ngOnInit(): void {
        this.coreService.feedLoading$
            .pipe(takeUntil(this.ngUnsubscribe$))
            .subscribe(([id, isLoadind]) => this.feedLoading[id] = isLoadind);
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
                for(let registration of registrations) {
                    registration.unregister()
                }
            });
        }
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe$.next();
        this.ngUnsubscribe$.complete();
    }


}
