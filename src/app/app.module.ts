import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {DBConfig, NgxIndexedDBModule} from 'ngx-indexed-db';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {FeedComponent} from './feed/feed.component';
import {HomeComponent} from './home/home.component';
import {HttpClientModule} from "@angular/common/http";
import {RouterModule} from "@angular/router";
import {SanitizeHtmlPipe} from "./pipes/sanitize-html.pipe";
import { FormsModule } from '@angular/forms';
import { PostComponent } from './post/post.component';
import { CountPipe } from './pipes/count.pipe';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';


const dbConfig: DBConfig = {
    name: 'Stupid-RSS-Reader',
    version: 1,
    objectStoresMeta: [
        {
            store: 'posts',
            storeConfig: {keyPath: 'id', autoIncrement: true},
            storeSchema: [
                {name: 'title', keypath: 'title', options: {unique: false}},
                {name: 'feedId', keypath: 'feedId', options: {unique: false}},
                {name: 'pubDate', keypath: 'pubDate', options: {unique: false}},
                {name: 'link', keypath: 'link', options: {unique: false}},
                {name: 'guid', keypath: 'guid', options: {unique: true}},
                {name: 'author', keypath: 'author', options: {unique: false}},
                {name: 'thumbnail', keypath: 'thumbnail', options: {unique: false}},
                {name: 'description', keypath: 'description', options: {unique: false}},
                {name: 'content', keypath: 'content', options: {unique: false}},
                {name: 'categories', keypath: 'categories', options: {unique: false}},
                {name: 'enclosure', keypath: 'enclosure', options: {unique: false}},
                {name: 'isNew', keypath: 'isNew', options: {unique: false}},
            ]
        },
        {
            store: 'feeds',
            storeConfig: {keyPath: 'id', autoIncrement: true},
            storeSchema: [
                {name: 'url', keypath: 'url', options: {unique: true}},
            ]
        }
    ]
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
