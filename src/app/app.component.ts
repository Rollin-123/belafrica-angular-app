/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit } from '@angular/core';
import { AppearanceService } from './core/services/appearance.service';

@Component({
    selector: 'bel-root',
    template: '<router-outlet></router-outlet>',
    styleUrls: []
})
export class AppComponent implements OnInit {
  title = 'BELAFRICA';

  constructor(private appearanceService: AppearanceService) {}

  ngOnInit() {
    this.appearanceService.loadTheme();
  }
}