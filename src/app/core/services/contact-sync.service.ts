/*
 * BELAFRICA - ContactSyncService
 * Synchronisation des contacts téléphoniques avec les membres BelAfrica
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SyncedContact {
  userId: string;
  pseudo: string;
  avatarUrl?: string;
  phoneNumber: string;
  community?: string;
}

@Injectable({ providedIn: 'root' })
export class ContactSyncService {
  private apiUrl = `${environment.apiUrl}/contacts`;
  private syncedContactsSubject = new BehaviorSubject<SyncedContact[]>([]);
  syncedContacts$ = this.syncedContactsSubject.asObservable();
  isContactsApiSupported = 'contacts' in navigator && 'ContactsManager' in window;

  constructor(private http: HttpClient) {
    this.loadCachedSyncedContacts();
  }

  private loadCachedSyncedContacts(): void {
    try {
      const cached = localStorage.getItem('belafrica_synced_contacts');
      if (cached) this.syncedContactsSubject.next(JSON.parse(cached));
    } catch { /* ignore */ }
  }

  /** Synchronise les contacts du téléphone avec BelAfrica */
  async syncContacts(): Promise<SyncedContact[]> {
    if (!this.isContactsApiSupported) {
      throw new Error('API Contacts non supportée sur ce navigateur.');
    }
    try {
      const contacts = await (navigator as any).contacts.select(['tel'], { multiple: true });
      const phoneNumbers: string[] = [];
      contacts.forEach((contact: any) => {
        if (contact.tel) {
          contact.tel.forEach((tel: string) => {
            const normalized = tel.replace(/\s+/g, '').replace(/[^\d+]/g, '');
            if (normalized.length >= 8) phoneNumbers.push(normalized);
          });
        }
      });

      if (phoneNumbers.length === 0) return [];
      return this.sendPhonesToBackend(phoneNumbers).toPromise() as Promise<SyncedContact[]>;
    } catch (err: any) {
      if (err.name === 'AbortError') return [];
      throw err;
    }
  }

  /** Envoie les numéros au backend et reçoit les membres BelAfrica correspondants */
  sendPhonesToBackend(phoneNumbers: string[]): Observable<SyncedContact[]> {
    return this.http.post<{ success: boolean; contacts: SyncedContact[] }>(
      `${this.apiUrl}/sync`, { phoneNumbers }
    ).pipe(
      map(resp => resp.contacts || []),
      tap(contacts => {
        this.syncedContactsSubject.next(contacts);
        localStorage.setItem('belafrica_synced_contacts', JSON.stringify(contacts));
      }),
      catchError(err => { console.error('Erreur sync contacts:', err); return of([]); })
    );
  }

  getSyncedContacts(): SyncedContact[] { return this.syncedContactsSubject.getValue(); }
  clearSyncedContacts(): void {
    this.syncedContactsSubject.next([]);
    localStorage.removeItem('belafrica_synced_contacts');
  }
}
