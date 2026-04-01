/*
 * BELAFRICA - ThemeService
 * Mode sombre/clair persistant + écoute du système
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'belafrica_theme';
  private modeSubject = new BehaviorSubject<ThemeMode>(this.loadSaved());
  mode$ = this.modeSubject.asObservable();

  constructor() {
    this.applyTheme(this.modeSubject.getValue());
    // Écouter les changements système
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.modeSubject.getValue() === 'system') this.applyTheme('system');
    });
  }

  private loadSaved(): ThemeMode {
    return (localStorage.getItem(this.KEY) as ThemeMode) || 'system';
  }

  setMode(mode: ThemeMode): void {
    localStorage.setItem(this.KEY, mode);
    this.modeSubject.next(mode);
    this.applyTheme(mode);
  }

  getMode(): ThemeMode { return this.modeSubject.getValue(); }

  get isDark(): boolean {
    const m = this.modeSubject.getValue();
    if (m === 'dark') return true;
    if (m === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(mode: ThemeMode): void {
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');
    if (mode === 'system') {
      body.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light');
    } else {
      body.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light');
    }
  }
}
