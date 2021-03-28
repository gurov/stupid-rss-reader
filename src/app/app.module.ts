import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DBConfig, NgxIndexedDBModule } from 'ngx-indexed-db';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FeedComponent } from './feed/feed.component';
import { HomeComponent } from './home/home.component';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SanitizeHtmlPipe } from './pipes/sanitize-html.pipe';
import { FormsModule } from '@angular/forms';
import { PostComponent } from './post/post.component';
import { CountPipe } from './pipes/count.pipe';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { TABLES } from './constants';

export function migrationFactory() {
    return {
        2: (db, transaction) => {
            const store = transaction.objectStore(TABLES.FEEDS);
            store.createIndex('newPostIds', 'newPostIds', { unique: false });
            store.createIndex('postIds', 'postIds', { unique: false });
        }
    };
};

const dbConfig: DBConfig = {
    name: 'Stupid-RSS-Reader',
    version: 2,
    objectStoresMeta: [
        {
            store: TABLES.POSTS,
            storeConfig: { keyPath: 'id', autoIncrement: true },
            storeSchema: [
                { name: 'title', keypath: 'title', options: { unique: false } },
                { name: 'feedId', keypath: 'feedId', options: { unique: false } },
                { name: 'pubDate', keypath: 'pubDate', options: { unique: false } },
                { name: 'link', keypath: 'link', options: { unique: false } },
                { name: 'guid', keypath: 'guid', options: { unique: true } },
                { name: 'author', keypath: 'author', options: { unique: false } },
                { name: 'thumbnail', keypath: 'thumbnail', options: { unique: false } },
                { name: 'description', keypath: 'description', options: { unique: false } },
                { name: 'content', keypath: 'content', options: { unique: false } },
                { name: 'categories', keypath: 'categories', options: { unique: false } },
                { name: 'enclosure', keypath: 'enclosure', options: { unique: false } },
                { name: 'isNew', keypath: 'isNew', options: { unique: false } }
            ]
        },
        {
            store: TABLES.FEEDS,
            storeConfig: { keyPath: 'id', autoIncrement: true },
            storeSchema: [
                { name: 'url', keypath: 'url', options: { unique: true } },
                { name: 'about', keypath: 'about', options: { unique: false } },
                { name: 'newCount', keypath: 'newCount', options: { unique: false } },
                { name: 'count', keypath: 'count', options: { unique: false } },
            ]
        }
    ],
    migrationFactory    
};

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        FeedComponent,
        PostComponent,
        CountPipe,
        SanitizeHtmlPipe
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule,
        RouterModule,
        AppRoutingModule,
        NgxIndexedDBModule.forRoot(dbConfig),
        ServiceWorkerModule.register('/stupid-rss-reader/ngsw-worker.js', { enabled: environment.production })
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
