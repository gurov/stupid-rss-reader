import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortUrl'
})
export class ShortUrlPipe implements PipeTransform {

  transform(url: string = ''): string {
    return url.replace('https://', '').replace('htts://', '');
  }

}
