/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Injectable } from '@angular/core';


export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class AppearanceService {
  private readonly THEME_KEY = 'belafrica_theme';

  constructor() { }

  /**
   * Charge le thème au démarrage de l'application.
   */
  loadTheme(): void {
    const savedTheme = this.getSavedTheme();
    this.setTheme(savedTheme);
  }

  /**
   * Applique le thème choisi.
   * @param theme Le thème à appliquer.
   */
  setTheme(theme: Theme): void {
    this.saveTheme(theme);
    this.applyTheme(theme);
  }

  /**
   * Applique concrètement le thème au body du document.
   * @param theme Le thème à appliquer.
   */
  private applyTheme(theme: Theme): void {
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.add(systemPrefersDark ? 'theme-dark' : 'theme-light');
    } else {
      body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    }
  }

  /**
   * Récupère le thème sauvegardé dans le localStorage.
   * @returns Le thème sauvegardé ou 'system' par défaut.
   */
  getSavedTheme(): Theme {
    return (localStorage.getItem(this.THEME_KEY) as Theme) || 'system';
  }

  /**
   * Sauvegarde le thème dans le localStorage.
   * @param theme Le thème à sauvegarder.
   */
  private saveTheme(theme: Theme): void {
    localStorage.setItem(this.THEME_KEY, theme);
  }
}
