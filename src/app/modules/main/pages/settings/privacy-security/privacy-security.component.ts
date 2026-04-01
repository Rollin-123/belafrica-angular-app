/*
 * BELAFRICA - PrivacySecurityComponent — Implémentation complète
 * Inspiration WhatsApp: blocage, last seen, read receipts, sessions, PIN, E2E
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SettingsService, UserSettings } from '../../../../../core/services/settings.service';
import { ContactService } from '../../../../../core/services/contact.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

export interface ActiveSession {
  id: string;
  device: string;
  ip: string;
  createdAt: Date;
  isCurrent?: boolean;
}

@Component({
  selector: 'bel-privacy-security',
  standalone: false,
  templateUrl: './privacy-security.component.html',
  styleUrl: './privacy-security.component.scss'
})
export class PrivacySecurityComponent implements OnInit, OnDestroy {

  settings!: UserSettings;
  blockedContacts: any[] = [];
  activeSessions: ActiveSession[] = [];
  isLoading = false;
  isLoadingSessions = false;

  // PIN modal
  showPinModal = false;
  pinStep: 'enter' | 'confirm' | 'disable' = 'enter';
  pinValue = '';
  pinConfirm = '';
  pinError = '';

  // Sections ouvertes
  openSection: string | null = null;

  private sub = new Subscription();

  constructor(
    private router: Router,
    private settingsService: SettingsService,
    private contactService: ContactService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.settings = { ...this.settingsService.getSettings() };
    this.sub.add(
      this.settingsService.settings$.subscribe(s => this.settings = { ...s })
    );
  }

  goBackToSettings(): void { this.router.navigate(['/app/settings']); }

  toggleSection(section: string): void {
    this.openSection = this.openSection === section ? null : section;
    if (section === 'blocked' && this.openSection === 'blocked') this.loadBlockedContacts();
    if (section === 'sessions' && this.openSection === 'sessions') this.loadActiveSessions();
  }

  // LAST SEEN
  setLastSeenVisibility(value: 'everyone' | 'contacts' | 'nobody'): void {
    this.settingsService.savePrivacySettings({
      privacyLastSeen: value,
      privacyReadReceipts: this.settings.privacyReadReceipts
    }).subscribe();
  }

  // READ RECEIPTS
  toggleReadReceipts(): void {
    this.settingsService.savePrivacySettings({
      privacyLastSeen: this.settings.privacyLastSeen,
      privacyReadReceipts: !this.settings.privacyReadReceipts
    }).subscribe();
  }

  // BLOCKED CONTACTS
  loadBlockedContacts(): void {
    this.isLoading = true;
    this.sub.add(
      this.http.get<{ contacts: any[] }>(`${environment.apiUrl}/contacts/blocked`).subscribe({
        next: resp => { this.blockedContacts = resp.contacts || []; this.isLoading = false; },
        error: () => this.isLoading = false
      })
    );
  }

  unblockContact(contactId: string): void {
    this.sub.add(
      this.http.delete(`${environment.apiUrl}/contacts/block/${contactId}`).subscribe({
        next: () => { this.blockedContacts = this.blockedContacts.filter(c => c.id !== contactId); }
      })
    );
  }

  // SESSIONS
  loadActiveSessions(): void {
    this.isLoadingSessions = true;
    this.sub.add(
      this.http.get<{ sessions: ActiveSession[] }>(`${environment.apiUrl}/auth/sessions`).subscribe({
        next: resp => { this.activeSessions = resp.sessions || []; this.isLoadingSessions = false; },
        error: () => this.isLoadingSessions = false
      })
    );
  }

  revokeSession(sessionId: string): void {
    this.sub.add(
      this.http.delete(`${environment.apiUrl}/auth/sessions/${sessionId}`).subscribe({
        next: () => { this.activeSessions = this.activeSessions.filter(s => s.id !== sessionId); }
      })
    );
  }

  // PIN
  get isPinEnabled(): boolean { return this.settingsService.isPINEnabled(); }

  openPinModal(): void {
    this.pinStep = this.isPinEnabled ? 'disable' : 'enter';
    this.pinValue = '';
    this.pinConfirm = '';
    this.pinError = '';
    this.showPinModal = true;
  }

  closePinModal(): void { this.showPinModal = false; }

  confirmPin(): void {
    if (this.pinStep === 'enter') {
      if (this.pinValue.length < 4) { this.pinError = 'Le PIN doit avoir au moins 4 chiffres.'; return; }
      this.pinStep = 'confirm';
      this.pinError = '';
    } else if (this.pinStep === 'confirm') {
      if (this.pinValue !== this.pinConfirm) { this.pinError = 'Les PINs ne correspondent pas.'; return; }
      this.settingsService.setPIN(this.pinValue);
      this.closePinModal();
    } else if (this.pinStep === 'disable') {
      if (!this.settingsService.verifyPIN(this.pinValue)) { this.pinError = 'PIN incorrect.'; return; }
      this.settingsService.removePIN();
      this.closePinModal();
    }
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }
}
