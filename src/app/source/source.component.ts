import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Post } from '../models';
import { map, switchMap, tap } from 'rxjs/operators';
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

        console.log('newPosts', newPosts);


        const oldPubDates = this.posts.map(post => post.pubDate);
        this.newPosts = newPosts.filter(post => !oldPubDates.includes(post.pubDate));

        // TODO add sort

        const postsForSaving = [...this.newPosts, ...this.posts];

        const t = 14 * 24 * 3600 * 1000; // 14 days
        postsForSaving.filter(post => +new Date() - Date.parse(post.pubDate) < t);

        this.coreService.saveLocalPosts(this.url, postsForSaving);

      }, () => {
      }, () => this.loading = false);


  }

}
