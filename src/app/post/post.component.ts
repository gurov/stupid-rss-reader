import {Component, Input} from '@angular/core';
import {Post} from '../models';


@Component({
    selector: 'app-post',
    templateUrl: './post.component.html'
})
export class PostComponent {

    @Input() post: Post = new Post();


    hidden = true;

    constructor() {
    }

    get shortInfo(): string {
        return [
            this.post.author,
            this.post.pubDate,
            this.readTime
        ].filter(a => a).join(', ');
    }

    get readTime(): string {
        const minutes = Math.round(this.post.content.toString().length / 1500);

        return minutes < 1 ? '' : `⏱ ~${minutes}m`;
    }
}
