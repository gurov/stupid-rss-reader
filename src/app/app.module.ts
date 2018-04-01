import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppComponent } from './app.component';

import { environment } from '../environments/environment';
import { SourceComponent } from './source/source.component';
import { HomeComponent } from './home/home.component';
import { NewsService } from './news.service';
import { SortPipe } from './sort.pipe';
import { IsoToDatePipe } from './iso-to-date.pipe';

@NgModule({
    declarations: [
        AppComponent,
        SourceComponent,
        HomeComponent,
        SortPipe,
        IsoToDatePipe
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        FormsModule,
        ServiceWorkerModule.register('/ngsw-worker.js', {enabled: environment.production})
    ],
    providers: [NewsService],
    bootstrap: [AppComponent]
})
export class AppModule {
}