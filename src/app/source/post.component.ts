import { Component, Input } from '@angular/core';
import { Post } from '../models';

@Component({
    selector: 'app-post',
    template: `
        <h6 class="text-muted">
            <span *ngIf="post.author || post.creator">
                {{post.author || post.creator}},
            </span>
            {{post.pubDate}}
        </h6>
        <h4>
            <a target="_blank" [href]="post.link">{{post.title}}</a><sup> ↗</sup>
        </h4>
        <div *ngIf="post?.categories?.length" class="small text-muted mb-1">
            <em *ngFor="let category of post.categories; let last = last">{{category}}<span *ngIf="!last">, </span></em>
        </div>
        <div [innerHTML]="post.description | sanitizeHtml"></div>
    `,
    styles: []
})
export class PostComponent {

    @Input() post: Post = new Post();

    constructor() {
    }
}
