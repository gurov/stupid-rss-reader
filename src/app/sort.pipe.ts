import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sort'
})
export class SortPipe implements PipeTransform {
  transform(array: any[], field: string, ask: boolean = true): any[] {
    array.sort((a: any, b: any) => {
      if (a[field] < b[field]) {
        return ask ? -1 : 1;
      } else if (a[field] > b[field]) {
        return ask ? 1 : -1;
      } else {
        return 0;
      }
    });
    return array;
  }
}
