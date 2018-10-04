import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Post } from '../models';
import { map, tap, switchMap, finalize } from 'rxjs/operators';
import { CoreService } from '../core.service';

@Component({
    selector: 'app-source',
    templateUrl: 'source.component.html'
})
export class SourceComponent implements OnInit {

    newPosts: Post[] = [];
    posts: Post[] = [];
    
    loading: boolean = false;
    url: string = '';

    constructor(private coreService: CoreService, private route: ActivatedRoute) {
    }

    ngOnInit() {
        this.loading = true;
        this.route.params
            .pipe(
                map(params => decodeURIComponent(params['url'])),
                tap(url => this.url = url),
                switchMap(url => this.coreService.getLocalPosts(url)),
                finalize(() => this.loading = false)
            )
            .subscribe(posts => this.posts = posts);

    }

    getNews() {
        this.loading = true;
        this.coreService.getNewPosts(this.url)
            .pipe(finalize(() => this.loading = false))
            .subscribe(newPosts => {

                const oldIsoDates = this.posts.map(post => post.isoDate);
                this.newPosts = newPosts.filter(post => !oldIsoDates.includes(post.isoDate));

                // TODO add sort

                const postsForSaving = [...this.newPosts, ...this.posts];

                const t = 14 * 24 * 3600 * 1000; // 14 days
                postsForSaving.filter(post => +new Date() - Date.parse(post.isoDate) < t);

            });


    }

}
