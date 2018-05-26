import { Component, OnInit } from '@angular/core';
import { NewsService } from '../news.service';
import { ActivatedRoute } from '@angular/router';
import { Feed, Post } from '../models';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/finally';

@Component({
    selector: 'app-source',
    templateUrl: 'source.component.html'
})
export class SourceComponent implements OnInit {

    feed: Feed = new Feed();
    newPosts: Post[] = [];
    showNewPosts: boolean = false;
    loading: boolean = false;

    constructor(private newsService: NewsService, private route: ActivatedRoute) {
    }

    ngOnInit() {
        this.loading = true;
        this.route.params
            .map(params => decodeURIComponent(params['url']))
            .do(url => this.feed = this.newsService.getFeed(url))
            .do(() => this.feed.stopWords = this.feed.stopWords || '')
            .switchMap(url => this.newsService.getNewPostsAndUpdate(url).finally(() => this.loading = false))
            .subscribe(posts => this.newPosts = posts);

    }

    changeContentView() {
        this.newsService.changeContentView(this.feed.url, this.feed.contentSnippet);
    }

    changeStopWords() {
        this.newsService.changeStopWords(this.feed.url, this.feed.stopWords);
    }
}
