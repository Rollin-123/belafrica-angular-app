/*
 * BELAFRICA - PrivateMessagingComponent
 * FIX: resetModalSearch_internal() ajouté (appelé dans le template)
 * FIX: privateConversationId, startPrivateChat, searchByPseudo/Phone
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContactService } from '../../../../core/services/contact.service';
import { Contact, ContactSearchResult } from '../../../../core/models/contact.model';
import { ModalService } from '../../../../core/services/modal.service';

@Component({
  selector: 'app-private-messaging',
  templateUrl: './private-messaging.component.html',
  styleUrls: ['./private-messaging.component.scss'],
  standalone: false
})
export class PrivateMessagingComponent implements OnInit, OnDestroy {
  contacts: Contact[] = [];
  isLoading = false;
  isSearching = false;
  isAddingContact = false;
  showAddContactModal = false;
  localSearch = '';
  searchMode: 'pseudo' | 'phone' = 'pseudo';
  searchQuery = '';
  searchResult: ContactSearchResult | null = null;
  searchResults: ContactSearchResult[] = [];
  searchError = '';
  private subscription = new Subscription();

  constructor(
    private contactService: ContactService,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit(): void { this.loadContacts(); }

  loadContacts(): void {
    this.isLoading = true;
    this.subscription.add(
      this.contactService.getContacts().subscribe({
        next: (contacts: Contact[]) => { this.contacts = contacts; this.isLoading = false; },
        error: (err: any) => { console.error('Erreur contacts:', err); this.isLoading = false; }
      })
    );
  }

  get contactsWithConversation(): Contact[] {
    return this.filteredContacts.filter(c => c.privateConversationId);
  }
  get contactsWithoutConversation(): Contact[] {
    return this.filteredContacts.filter(c => !c.privateConversationId);
  }
  get filteredContacts(): Contact[] {
    if (!this.localSearch.trim()) return this.contacts;
    const q = this.localSearch.toLowerCase();
    return this.contacts.filter(c =>
      c.pseudo?.toLowerCase().includes(q) || c.community?.toLowerCase().includes(q)
    );
  }

  openOrStartChat(contact: Contact): void {
    if (contact.privateConversationId) {
      this.router.navigate(['/app/chat', contact.privateConversationId]);
    } else {
      this.isLoading = true;
      this.contactService.startPrivateChat(contact.userId).subscribe({
        next: (result: { success: boolean; conversationId: string; isNew: boolean }) => {
          this.isLoading = false;
          this.router.navigate(['/app/chat', result.conversationId]);
        },
        error: (err: any) => { console.error('Erreur conversation:', err); this.isLoading = false; }
      });
    }
  }

  openAddModal(): void { this.showAddContactModal = true; this.resetModalSearch(); }
  closeAddModal(): void { this.showAddContactModal = false; this.resetModalSearch(); }

  resetModalSearch(): void {
    this.searchQuery = '';
    this.searchResult = null;
    this.searchResults = [];
    this.searchError = '';
    this.isSearching = false;
  }

  // FIX: méthode exposée pour le template (le template l'appelle sous ce nom)
  resetModalSearch_internal(): void { this.resetModalSearch(); }

  search(): void {
    if (!this.searchQuery.trim()) return;
    this.isSearching = true;
    this.searchError = '';
    this.searchResults = [];
    this.searchResult = null;

    if (this.searchMode === 'pseudo') {
      this.subscription.add(
        this.contactService.searchByPseudo(this.searchQuery).subscribe({
          next: (resp: { success: boolean; users?: ContactSearchResult[]; error?: string }) => {
            this.searchResults = resp.users || [];
            this.isSearching = false;
            if (!this.searchResults.length) this.searchError = 'Aucun membre trouvé dans votre communauté.';
          },
          error: (err: any) => {
            console.error('Erreur recherche:', err);
            this.searchError = 'Erreur lors de la recherche. Réessayez.';
            this.isSearching = false;
          }
        })
      );
    } else {
      this.subscription.add(
        this.contactService.searchByPhone(this.searchQuery).subscribe({
          next: (resp: { success: boolean; user?: ContactSearchResult; error?: string; notOnApp?: boolean }) => {
            this.searchResult = resp.user || null;
            this.isSearching = false;
            if (!resp.user) this.searchError = resp.notOnApp ? "Ce numéro n'est pas sur BelAfrica." : (resp.error || 'Aucun résultat.');
          },
          error: (err: any) => {
            console.error('Erreur recherche tel:', err);
            this.searchError = 'Erreur lors de la recherche. Réessayez.';
            this.isSearching = false;
          }
        })
      );
    }
  }

  addContact(result: ContactSearchResult): void {
    this.isAddingContact = true;
    this.subscription.add(
      this.contactService.addContact(result.id).subscribe({
        next: () => { this.isAddingContact = false; this.closeAddModal(); this.loadContacts(); },
        error: (err: any) => { console.error('Erreur ajout:', err); this.isAddingContact = false; }
      })
    );
  }

  getInitials(pseudo: string): string {
    return pseudo ? pseudo.substring(0, 2).toUpperCase() : '?';
  }

  getLastSeen(contact: Contact): string {
    if (contact.isOnline) return 'En ligne';
    const lastSeenRaw = (contact as any).lastSeen;
    if (!lastSeenRaw) return '';
    const diff = Date.now() - new Date(lastSeenRaw).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    return `il y a ${Math.floor(hrs / 24)}j`;
  }

  ngOnDestroy(): void { this.subscription.unsubscribe(); }
}
