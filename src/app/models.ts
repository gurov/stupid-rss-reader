export class Post {
    creator: string;
    title: string;
    link: string;
    author: string;
    description: string;
    contentSnippet: string;
    categories: string[];
    pubDate: string;
    datejs: Date;
    enclosure?: {
        length: number,
        type: string,
        url: string
    }
}

