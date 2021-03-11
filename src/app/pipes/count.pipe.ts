import {Pipe, PipeTransform} from '@angular/core';
import {NgxIndexedDBService} from 'ngx-indexed-db';
import {map} from 'rxjs/operators';
import {TABLES} from '../constants';
import {Observable} from 'rxjs';
import {Post} from '../models';


@Pipe({
    name: 'count'
})
export class CountPipe implements PipeTransform {

    constructor(private dbService: NgxIndexedDBService) {
    }

    transform(feedId: number, isNew?: boolean): Observable<number> {
        const filterPostFn = (p: Post) => isNew === undefined || p.isNew === isNew;
        return this.dbService.getAllByIndex(TABLES.POSTS, 'feedId', IDBKeyRange.only(feedId))
            .pipe(map(posts => posts.filter(filterPostFn).length));
    }
}
