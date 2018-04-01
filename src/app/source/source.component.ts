import { Component, OnInit } from '@angular/core';
import { NewsService } from '../news.service';
import { ActivatedRoute } from '@angular/router';
import { Feed, Post } from '../models';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/map';

@Component({
    selector: 'app-source',
    templateUrl: 'source.component.html',
    styles: [`
  `]
})
export class SourceComponent implements OnInit {

    feed: Feed = new Feed();
    newPosts: Post[] = [];
    showNewPosts: boolean = false;

    constructor(private newsService: NewsService, private route: ActivatedRoute) {
    }

    ngOnInit() {
        this.route.params
            .map(params => decodeURIComponent(params['url']))
            .do(url => this.feed = this.newsService.getFeed(url))
            .switchMap(url => this.newsService.getNewPostsAndUpdate(url))
            .subscribe(posts => this.newPosts = posts);
    }
}