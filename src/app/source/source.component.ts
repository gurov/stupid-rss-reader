import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Post } from '../models';
import { map, switchMap, tap } from 'rxjs/operators';
import { CoreService } from '../core.service';
import { sortBy } from 'lodash';

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
    this.route.params
      .pipe(
        map(params => decodeURIComponent(params['url'])),
        tap(url => this.url = url),
        switchMap(url => this.coreService.getLocalPosts(url))
      )
      .subscribe(posts => {
        this.posts = posts;
        console.log(posts);
      });

  }

  getNews() {
    this.loading = true;
    this.coreService.getNewPosts(this.url)
      .subscribe(newPosts => {

        const oldPubDates = this.posts.map(post => post.date);
        this.newPosts = sortBy<Post>(newPosts
          .filter(post => !oldPubDates.includes(post.date)), 'date').reverse();

        const t = 30 * 24 * 3600 * 1000; // 30 days

        const postsForSaving = [...this.newPosts, ...this.posts]
          .filter((post: Post) => (+new Date() - +post.date) < t);

        this.coreService.saveLocalPosts(this.url, sortBy<Post>(postsForSaving, 'date').reverse());

      }, () => {
      }, () => this.loading = false);


  }

}
