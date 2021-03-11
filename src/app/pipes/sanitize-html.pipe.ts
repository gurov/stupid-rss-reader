import {Pipe, PipeTransform} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';


@Pipe({
    name: 'sanitizeHtml'
})
export class SanitizeHtmlPipe implements PipeTransform {

    constructor(private domSanitizer: DomSanitizer) {
    }

    transform(v: string): SafeHtml {
        return this.domSanitizer.bypassSecurityTrustHtml(v);
    }
}
