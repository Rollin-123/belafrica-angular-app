/*
 * BELAFRICA - LanguageRegionComponent — Implémentation complète
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService } from '../../../../../core/services/settings.service';

interface LanguageOption { code: string; label: string; nativeLabel: string; flag: string; }
interface RegionOption { code: string; label: string; }

@Component({
  selector: 'bel-language-region',
  standalone: false,
  templateUrl: './language-region.component.html',
  styleUrl: './language-region.component.scss'
})
export class LanguageRegionComponent implements OnInit {
  selectedLanguage: string;
  selectedRegion: string;

  languages: LanguageOption[] = [
    { code: 'fr', label: 'Français', nativeLabel: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'Anglais', nativeLabel: 'English', flag: '🇬🇧' },
    { code: 'pt', label: 'Portugais', nativeLabel: 'Português', flag: '🇵🇹' },
    { code: 'ar', label: 'Arabe', nativeLabel: 'العربية', flag: '🇲🇦' },
    { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili', flag: '🇰🇪' },
  ];

  regions: RegionOption[] = [
    { code: 'FR', label: 'France' },
    { code: 'BE', label: 'Belgique' },
    { code: 'CH', label: 'Suisse' },
    { code: 'CA', label: 'Canada' },
    { code: 'CM', label: 'Cameroun' },
    { code: 'SN', label: 'Sénégal' },
    { code: 'CI', label: "Côte d'Ivoire" },
    { code: 'CD', label: 'Congo (RDC)' },
    { code: 'MA', label: 'Maroc' },
    { code: 'NG', label: 'Nigeria' },
    { code: 'GH', label: 'Ghana' },
  ];

  constructor(
    private router: Router,
    private settingsService: SettingsService
  ) {
    const settings = this.settingsService.getSettings();
    this.selectedLanguage = settings.language || 'fr';
    this.selectedRegion = settings.region || 'FR';
  }

  ngOnInit(): void {}

  goBackToSettings(): void { this.router.navigate(['/app/settings']); }

  onLanguageChange(code: string): void {
    this.selectedLanguage = code;
    this.settingsService.updateSettings({ language: code });
    // En production : i18n service ici
  }

  onRegionChange(code: string): void {
    this.selectedRegion = code;
    this.settingsService.updateSettings({ region: code });
  }
}
