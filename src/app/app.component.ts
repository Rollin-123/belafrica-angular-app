/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'bel-root',
    imports: [RouterModule],
    template: '<router-outlet></router-outlet>',
    styleUrls: []
})
export class AppComponent {   title = 'BELAFRICA'; }