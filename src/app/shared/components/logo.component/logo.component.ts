/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, Input } from '@angular/core';
import { LogoService } from '../../../core/services/logo.service';

@Component({
  selector: 'app-logo',
  standalone: false,
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent {
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  logoUrl: string;

  constructor(private logoService: LogoService) {
    this.logoUrl = this.logoService.getLogoUrl();
  }
}