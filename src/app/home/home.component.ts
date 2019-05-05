import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CORSProxyList } from '../constants';
import { CoreService } from '../core.service';
import { Observable } from 'rxjs';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styles: []
})
export class HomeComponent implements OnInit {

  newFeed: string = '';
  cors: string = 'corsio';
  error: string = '';
  feeds: string[] = [];
  loading: boolean = false;
  CORSList = [];
  version$: Observable<string> = null;

  constructor(public coreService: CoreService) {
    Object.keys(CORSProxyList)
      .forEach(key => this.CORSList.push({key, url: CORSProxyList[key]}));
    const lastCORS = localStorage.getItem('cors');
    if (lastCORS && CORSProxyList[lastCORS]) {
      this.cors = lastCORS;
    }
  }

  setCors(event: string) {
    localStorage.setItem('cors', event);
  }

  load() {
    this.feeds = this.coreService.feeds;
  }

  ngOnInit() {
    this.load();
    this.version$ = this.coreService.getVersion();
  }

  removeFeed(url: string) {
    if (confirm(`Delete the feed: ${url}?`)) {
      this.coreService.removeFeed(url);
      this.coreService.clear(url);
      this.load();
    }
  }

  add() {
    this.newFeed = this.newFeed.trim();

    this.loading = true;
    this.error = '';
    this.coreService.add(this.newFeed)
      .pipe(
        finalize(() => this.loading = false)
      )
      .subscribe(() => {
        this.newFeed = '';
        this.load();
      }, error => this.error = error);
  }

}
