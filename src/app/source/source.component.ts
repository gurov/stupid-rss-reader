import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Post } from '../models';
import { map, switchMap, tap, finalize } from 'rxjs/operators';
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
  error: any = null;

  constructor(private coreService: CoreService, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.error = '';
    this.route.params
      .pipe(
        map(params => decodeURIComponent(params['url'])),
        tap(url => this.url = url),
        switchMap(url => this.coreService.getLocalPosts(url))
      )
      .subscribe(posts => this.posts = posts);

  }

  getNews() {
    this.loading = true;
    this.coreService.getNewPosts(this.url)
      .pipe(finalize(() => this.loading = false))
      .subscribe(newPosts => {

        const oldPubDates = this.posts.map(post => post.isoDate);

        this.newPosts = newPosts.filter(post => !oldPubDates.includes(post.isoDate));

        const t = 30 * 24 * 3600 * 1000; // 30 days

        const postsForSaving = [...this.newPosts, ...this.posts]
          .filter((post: Post) => (+new Date() - +new Date(post.isoDate)) < t);

        this.coreService.saveLocalPosts(this.url, postsForSaving);
      }, e => this.error = e);

  }

  clear() {
    if (confirm(`Clear this feed?`)) {
      this.newPosts = [];
      this.posts = [];
      this.coreService.clear(this.url); 
    }
  }

}
