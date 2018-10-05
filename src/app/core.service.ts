import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Post } from './models';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { formatPost, parse } from './parser';
import { get } from 'lodash';
import { CORSProxyList } from './constants';

@Injectable({
  providedIn: 'root'
})
export class CoreService {

  feeds: string[] = [];

  constructor(private http: HttpClient) {

    const feedString = localStorage.getItem('feedList');

    try {
      this.feeds = JSON.parse(feedString) || [];
    } catch (error) {
    }

    // support first version
    if (this.feeds.length === 0) {
      const storeString = localStorage.getItem('store');

      try {
        this.feeds = JSON.parse(storeString).map(s => s['url']) || [];
      } catch (error) {
      }
    }

    // for first start
    if (this.feeds.length === 0) {
      this.feeds = [
        'https://hnrss.org/newest?points=300&comments=100'
      ];
      localStorage.setItem('feedList', JSON.stringify(this.feeds));
    }

    console.log('feeds', this.feeds);

  }

  getLocalPosts(url: string = ''): Observable<Post[]> {
    if (!url) {
      return of([]);
    }

    const postsSource: string = localStorage.getItem('POSTS' + url) || '[]';
    let posts: Post[] = [];

    try {
      posts = JSON.parse(postsSource) || [];
    } catch (e) {
      console.error('parse posts from localStorage', e);
    }

    return of(posts);
  }

  saveLocalPosts(url: string, posts: Post[] = []) {
    localStorage.setItem('POSTS' + url, JSON.stringify(posts));
  }

  getNewPosts(url: string) {
    if (!url) {
      return of([]);
    }

    let proxyUrl = CORSProxyList.corsanywhere;

    const lastCORS = localStorage.getItem('cors');
    if (lastCORS && CORSProxyList[lastCORS]) {
      proxyUrl = CORSProxyList[lastCORS];
    }


    return this.http.get(proxyUrl + url, {responseType: 'text'})
      .pipe(map(xmlText => {
        const XML = new DOMParser().parseFromString(xmlText, 'text/xml');
        ;
        const obj = parse(XML);
        const items = get(obj, 'channel.item') || [];
        return items.map(formatPost);
      }));
  }

  removeFeed(url: string) {
    this.feeds = this.feeds.filter(item => item !== url);
    localStorage.setItem('feedList', JSON.stringify(this.feeds));
  }


  add(url: string): Observable<any> {
    const a = this.feeds.find(u => u === url);
    if (!a) {
      this.feeds.push(url)
      localStorage.setItem('feedList', JSON.stringify(this.feeds));
      return of(true);
    }
    return Observable.throw('Error: The feed exist');

  }

}
