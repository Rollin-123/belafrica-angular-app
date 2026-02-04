// src/app/modules/main/pages/settings/appearance/appearance.component.ts
import { Component, OnInit } from '@angular/core';
import { AppearanceService, Theme } from '../../../../../core/services/appearance.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-appearance',
  templateUrl: './appearance.component.html',
  styleUrls: ['./appearance.component.scss'],
  standalone: false
})
export class AppearanceComponent implements OnInit {
  selectedTheme: Theme;

  constructor(
    private appearanceService: AppearanceService,
    private router: Router,
  ) {
    this.selectedTheme = this.appearanceService.getSavedTheme();
  }

  ngOnInit(): void {}

  
  goBackToSettings(): void {
    this.router.navigate(['/app/settings']);
  }
  onThemeChange(theme: Theme): void {
    this.selectedTheme = theme;
    this.appearanceService.setTheme(theme);
  }
}
