import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'isoToDate'
})
export class IsoToDatePipe implements PipeTransform {

  transform(isoDate: string = ''): Date {
    try {
      return new Date(Date.parse(isoDate));
    } catch (error) {
      return null;
    }

  }

}
