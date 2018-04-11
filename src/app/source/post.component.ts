import { Component, Input } from '@angular/core';
import { Post } from '../models';

@Component({
    selector: 'app-post',
    template: `
        <h6 class="text-muted">{{post.author || post.creator}}, {{post.isoDate | isoToDate | date}},
            <a target="_blank" [href]="post.link">link ➢</a></h6>
        <h4>{{post.title}}</h4>
        <div *ngIf="post?.categories?.length" class="small text-muted mb-1">
            <em *ngFor="let category of post.categories; let last = last">{{category}}<span *ngIf="!last">, </span></em>
        </div>
        <div [innerHTML]="post.content"></div>
    `,
    styles: []
})
export class PostComponent {

    @Input() post: Post = new Post();

    constructor() {
    }

}
