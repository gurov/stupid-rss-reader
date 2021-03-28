export interface Enclosure {
    link?: string;
    type?: string;
    thumbnail?: string;
    url?: string;
    length?: number;
}

export type FeedLoading = Record<number,boolean>;

export type FeedError = Record<number,string>;


export class FeedItem {
    url: string;
    id: number;
    newCount?: number;
    count?: number
    about?: SiteFeedAbout;
}

export class SiteFeedAbout {
    author: string;
    description: string;
    image: string;
    link: string;
    title: string;
    url: string;
}

export class SiteFeed {
    static: string;
    feed: SiteFeedAbout;
    items: Post[];
}

export class Post {
    id?: number;
    title: string;
    pubDate?: string;
    link: string;
    guid: string;
    author: string;
    thumbnail: string;
    description: string;
    content: string;
    categories: string[] | any;
    enclosure: Enclosure;
    isNew?: boolean;
}

