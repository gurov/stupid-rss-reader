import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div (scroll)="onMouseWheel($event)">
      <router-outlet></router-outlet>
    </div>
    `,
  styles: []
})
export class AppComponent {
   onMouseWheel(evt) {
    console.log('Wheel event: ', evt);
  }
}
