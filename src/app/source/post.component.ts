import { Component, Input } from '@angular/core';
import { Post } from '../models';

@Component({
  selector: 'app-post',
  template: `
    <h6 class="text-muted">
            <span *ngIf="post.author">
                {{post.author}},
            </span>
      {{post.isoDate ? (post.isoDate|isoToDate|date:'yyyy-MM-dd HH:mm') : ''}}
    </h6>
    <h4 *ngIf="hidden" (click)="hidden = !hidden" class="text-muted">
      {{post.title}}<sup class="more-info">…</sup>
    </h4>
    <h4 *ngIf="!hidden">
      <a target="_blank" [href]="post.link">{{post.title}}</a><sup> ↗</sup>
    </h4>
    <div *ngIf="post?.categories?.length && !hidden" class="small text-muted mb-1">
      <em *ngFor="let cat of post.categories; let last = last">{{cat}}<span *ngIf="!last">, </span></em>
    </div>
    <div class="post-container" *ngIf="!hidden">
      <div [innerHTML]="post.description | sanitizeHtml"></div>
    </div>
  `,
  styles: []
})
export class PostComponent {

  @Input() post: Post = new Post();
  @Input() hidden = false;

  constructor() {
  }
}
