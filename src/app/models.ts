export class Feed {
    items: Post[] = [];
    contentSnippet: boolean = false;
    stopWords: string = '';
    url: string;
}

export class Post {
    creator: string;
    title: string;
    link: string;
    author: string;
    content: string;
    contentSnippet: string;
    categories: string[];
    isoDate: string;
    enclosure?: {
        length: number,
        type: string,
        url: string
    }
}
