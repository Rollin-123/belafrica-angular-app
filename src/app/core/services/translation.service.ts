/*
 * BELAFRICA - TranslationService
 * i18n simple sans dépendance externe (ngx-translate optionnel)
 * Utilise des fichiers assets/i18n/fr.json et en.json
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly KEY = 'belafrica_lang';
  private translations: Record<string, string> = {};
  private langSubject = new BehaviorSubject<string>(localStorage.getItem(this.KEY) || 'fr');
  currentLang$ = this.langSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadLanguage(this.langSubject.getValue()).subscribe();
  }

  loadLanguage(lang: string): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`assets/i18n/${lang}.json`).pipe(
      tap(t => { this.translations = t; this.langSubject.next(lang); localStorage.setItem(this.KEY, lang); }),
      catchError(() => { console.warn(`Traductions ${lang} non trouvées.`); return of({}); })
    );
  }

  setLanguage(lang: string): void { this.loadLanguage(lang).subscribe(); }
  getCurrentLang(): string { return this.langSubject.getValue(); }
  t(key: string, fallback?: string): string { return this.translations[key] || fallback || key; }
}
