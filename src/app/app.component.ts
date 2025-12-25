import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'bel-root',
  standalone: true,
  imports: [RouterModule], 
  template: '<router-outlet></router-outlet>', 
  styleUrls: []
})
export class AppComponent {   title = 'BELAFRICA'; }