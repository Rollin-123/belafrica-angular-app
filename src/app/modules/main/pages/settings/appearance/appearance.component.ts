/*
 * BELAFRICA - AppearanceComponent — Implémentation complète
 * Thème clair/sombre/système + taille de police
 */
import { Component, OnInit } from '@angular/core';
import { AppearanceService, Theme } from '../../../../../core/services/appearance.service';
import { SettingsService } from '../../../../../core/services/settings.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-appearance',
  templateUrl: './appearance.component.html',
  styleUrls: ['./appearance.component.scss'],
  standalone: false
})
export class AppearanceComponent implements OnInit {
  selectedTheme: Theme;
  selectedFontSize: 'small' | 'medium' | 'large';

  themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Clair', icon: 'light_mode' },
    { value: 'dark', label: 'Sombre', icon: 'dark_mode' },
    { value: 'system', label: 'Automatique', icon: 'brightness_auto' },
  ];

  fontSizes: { value: 'small' | 'medium' | 'large'; label: string; preview: string }[] = [
    { value: 'small', label: 'Petit', preview: 'A' },
    { value: 'medium', label: 'Moyen', preview: 'A' },
    { value: 'large', label: 'Grand', preview: 'A' },
  ];

  constructor(
    private appearanceService: AppearanceService,
    private settingsService: SettingsService,
    private router: Router,
  ) {
    this.selectedTheme = this.appearanceService.getSavedTheme();
    this.selectedFontSize = this.settingsService.getSettings().fontSize;
  }

  ngOnInit(): void {}

  goBackToSettings(): void { this.router.navigate(['/app/settings']); }

  onThemeChange(theme: Theme): void {
    this.selectedTheme = theme;
    this.appearanceService.setTheme(theme);
    this.settingsService.updateSettings({ theme });
  }

  onFontSizeChange(size: 'small' | 'medium' | 'large'): void {
    this.selectedFontSize = size;
    this.settingsService.updateSettings({ fontSize: size });
    document.documentElement.setAttribute('data-font-size', size);
  }
}
