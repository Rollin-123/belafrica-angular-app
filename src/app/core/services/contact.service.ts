/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Contact, ContactSearchResult } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private apiUrl = `${environment.apiUrl}/contacts`;
  private contacts$ = new BehaviorSubject<Contact[]>([]);

  constructor(private http: HttpClient) {}

  getContacts(): Observable<Contact[]> {
    return this.http.get<{ success: boolean; contacts: Contact[] }>(this.apiUrl).pipe(
      map(r => r.contacts || []),
      tap(contacts => this.contacts$.next(contacts))
    );
  }

  getContactsSnapshot(): Contact[] {
    return this.contacts$.getValue();
  }

  /**
   * Recherche par numéro de téléphone
   */
  searchByPhone(phone: string): Observable<{ success: boolean; user?: ContactSearchResult; error?: string; notOnApp?: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/search`, { phone });
  }

  /**
   * Recherche par pseudo (parmi les membres de la même communauté)
   */
  searchByPseudo(pseudo: string): Observable<{ success: boolean; users?: ContactSearchResult[]; error?: string }> {
    return this.http.post<any>(`${this.apiUrl}/search-pseudo`, { pseudo });
  }

  addContact(contactUserId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/add`, { contactUserId });
  }

  removeContact(contactUserId: string): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${this.apiUrl}/${contactUserId}`);
  }

  blockContact(contactUserId: string): Observable<{ success: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/block/${contactUserId}`, {});
  }

  startPrivateChat(contactUserId: string): Observable<{ success: boolean; conversationId: string; isNew: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/start-private-chat`, { contactUserId });
  }
}
