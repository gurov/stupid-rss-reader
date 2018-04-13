import { Component, Input } from '@angular/core';
import { Post } from '../models';

@Component({
    selector: 'app-post',
    template: `
        <h6 class="text-muted">
            <span *ngIf="post.author || post.creator">
                {{post.author || post.creator}},
            </span>
            {{post.isoDate | isoToDate | date}},
            <a target="_blank" [href]="post.link">link ➢</a></h6>
        <h4>{{post.title}}</h4>
        <div *ngIf="post?.categories?.length" class="small text-muted mb-1">
            <em *ngFor="let category of post.categories; let last = last">{{category}}<span *ngIf="!last">, </span></em>
        </div>
        <div *ngIf="!contentSnippet" [innerHTML]="post.content"></div>
        <div *ngIf="contentSnippet && post.enclosure">
            <img [src]="post.enclosure.url" class="mt-1 mb-2">
        </div>
        <p *ngIf="contentSnippet">{{post.contentSnippet}}</p>
    `,
    styles: []
})
export class PostComponent {

    @Input() post: Post = new Post();
    @Input() contentSnippet: boolean = false;

    constructor() {
    }

    postHasImage(post: Post): boolean {
        return !!post.enclosure
            && post.enclosure.type.includes('image')
            && !!post.enclosure.url;
    }

}
