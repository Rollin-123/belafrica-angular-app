/*
 * BELAFRICA - SettingsService
 * Gère la persistance des préférences utilisateur (Supabase + localStorage)
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserSettings {
  // Confidentialité
  privacyLastSeen: 'everyone' | 'contacts' | 'nobody';
  privacyReadReceipts: boolean;
  // Apparence (localStorage)
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  // Langue
  language: string;
  region: string;
  // Notifications
  notificationsEnabled: boolean;
  notificationSound: boolean;
  notificationVibration: boolean;
  // PIN
  pinEnabled: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  privacyLastSeen: 'everyone',
  privacyReadReceipts: true,
  theme: 'system',
  fontSize: 'medium',
  language: 'fr',
  region: 'FR',
  notificationsEnabled: true,
  notificationSound: true,
  notificationVibration: true,
  pinEnabled: false,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/users`;
  private settingsSubject = new BehaviorSubject<UserSettings>(this.loadLocalSettings());
  settings$ = this.settingsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private loadLocalSettings(): UserSettings {
    try {
      const saved = localStorage.getItem('belafrica_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  getSettings(): UserSettings { return this.settingsSubject.getValue(); }

  /** Met à jour un ou plusieurs champs et persiste */
  updateSettings(partial: Partial<UserSettings>): void {
    const current = this.settingsSubject.getValue();
    const updated = { ...current, ...partial };
    this.settingsSubject.next(updated);
    localStorage.setItem('belafrica_settings', JSON.stringify(updated));
  }

  /** Persiste les paramètres de confidentialité sur Supabase via le backend */
  savePrivacySettings(partial: Pick<UserSettings, 'privacyLastSeen' | 'privacyReadReceipts'>): Observable<any> {
    return this.http.put(`${this.apiUrl}/privacy-settings`, {
      privacy_last_seen: partial.privacyLastSeen,
      privacy_read_receipts: partial.privacyReadReceipts
    }).pipe(
      tap(() => this.updateSettings(partial)),
      catchError(err => { console.error('Erreur save privacy:', err); return of(null); })
    );
  }

  /** Charge les préférences depuis le backend */
  loadRemoteSettings(): Observable<Partial<UserSettings>> {
    return this.http.get<any>(`${this.apiUrl}/settings`).pipe(
      map(resp => ({
        privacyLastSeen: resp.privacy_last_seen || 'everyone',
        privacyReadReceipts: resp.privacy_read_receipts !== false,
      })),
      tap(remote => this.updateSettings(remote)),
      catchError(err => { console.error('Erreur load settings:', err); return of({}); })
    );
  }

  // PIN local (hash basique — pour une app mobile utiliser Capacitor Keychain)
  setPIN(pin: string): void {
    const hash = btoa(pin + '_belafrica_salt');
    localStorage.setItem('belafrica_pin_hash', hash);
    this.updateSettings({ pinEnabled: true });
  }

  verifyPIN(pin: string): boolean {
    const stored = localStorage.getItem('belafrica_pin_hash');
    return stored === btoa(pin + '_belafrica_salt');
  }

  removePIN(): void {
    localStorage.removeItem('belafrica_pin_hash');
    this.updateSettings({ pinEnabled: false });
  }

  isPINEnabled(): boolean {
    return !!localStorage.getItem('belafrica_pin_hash');
  }
}
