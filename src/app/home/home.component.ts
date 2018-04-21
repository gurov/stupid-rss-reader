import { Component, OnInit } from '@angular/core';
import { CORSProxyList, NewsService } from '../news.service';
import { Feed } from '../models';
import 'rxjs/add/operator/finally';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styles: []
})
export class HomeComponent implements OnInit {

    newFeed: string = '';
    cors: string = 'corsanywhere';
    days: number = +localStorage.getItem('days') || 14;
    error: string = '';
    store: Feed[] = [];
    loading: boolean = false;
    CORSList = [];

    constructor(public newsService: NewsService) {
        Object.keys(CORSProxyList)
            .forEach(key => this.CORSList.push({key, url: CORSProxyList[key]}));
        const lastCORS = localStorage.getItem('cors');
        if (lastCORS && CORSProxyList[lastCORS]) {
            this.cors = CORSProxyList[lastCORS];
        }
    }

    setCors(event: string) {
        localStorage.setItem('cors', event);
    }

    setDays(event: number) {
        localStorage.setItem('days', event.toString());
    }

    load() {
        this.store = this.newsService.store;
    }

    ngOnInit() {
        this.load();
    }

    removeFeed(url: string) {
        if (confirm(`Delete the feed: ${url}?`)) {
            this.newsService.deleteFeed(url);
            this.load();
        }
    }

    add() {
        this.newFeed = this.newFeed.trim().toLowerCase();

        this.loading = true;
        this.error = '';
        this.newsService.add(this.newFeed)
            .finally(() => this.loading = false)
            .subscribe(() => this.newFeed = '', error => this.error = error);
    }

}
