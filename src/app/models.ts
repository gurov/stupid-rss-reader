export class Feed {
    items: Post[] = [];
    url: string;
}

export class Post {
    creator: string;
    title: string;
    link: string;
    author: string;
    content: string;
    categories: string[];
    isoDate: string;
}
