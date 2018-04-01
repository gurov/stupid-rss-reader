import { Component, OnInit } from '@angular/core';
import { NewsService } from '../news.service';
import { Feed } from '../models';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styles: []
})
export class HomeComponent implements OnInit {

    newFeed: string = '';
    cors: string = localStorage.getItem('cors') || 'cors1';
    days: number = +localStorage.getItem('days') || 14;
    error: string = '';
    store: Feed[] = [];

    constructor(public newsService: NewsService) {
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
        this.error = '';
        this.newsService.add(this.newFeed.trim())
            .subscribe(() => this.newFeed = '', error => this.error = error);
    }

}
