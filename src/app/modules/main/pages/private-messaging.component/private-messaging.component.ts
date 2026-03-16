/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
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

  // Recherche dans la liste locale
  localSearch = '';

  // Modal ajout contact
  searchMode: 'pseudo' | 'phone' = 'pseudo';
  searchQuery = '';
  searchResult: ContactSearchResult | null = null;
  searchResults: ContactSearchResult[] = [];
  searchError = '';

  private sub = new Subscription();

  constructor(
    private contactService: ContactService,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit() { this.loadContacts(); }
  ngOnDestroy() { this.sub.unsubscribe(); }

  loadContacts() {
    this.isLoading = true;
    this.sub.add(
      this.contactService.getContacts().subscribe({
        next: (c) => { this.contacts = c; this.isLoading = false; },
        error: () => { this.isLoading = false; }
      })
    );
  }

  /** Contacts filtrés par la barre de recherche locale */
  get filteredContacts(): Contact[] {
    if (!this.localSearch.trim()) return this.contacts;
    const q = this.localSearch.toLowerCase();
    return this.contacts.filter(c =>
      c.pseudo.toLowerCase().includes(q) ||
      c.community?.toLowerCase().includes(q)
    );
  }

  /** Conversations existantes en haut, nouveaux contacts en bas */
  get contactsWithConversation(): Contact[] {
    return this.filteredContacts.filter(c => c.privateConversationId);
  }
  get contactsWithoutConversation(): Contact[] {
    return this.filteredContacts.filter(c => !c.privateConversationId);
  }

  openOrStartChat(contact: Contact) {
    if (contact.privateConversationId) {
      this.router.navigate(['/app/chat', contact.privateConversationId]);
    } else {
      this.isLoading = true;
      this.contactService.startPrivateChat(contact.userId).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.router.navigate(['/app/chat', res.conversationId]);
        },
        error: () => {
          this.isLoading = false;
          this.modalService.showError('Erreur', 'Impossible de démarrer la conversation.');
        }
      });
    }
  }

  confirmRemoveContact(contact: Contact) {
    this.modalService.showConfirm('Supprimer', `Retirer ${contact.pseudo} de vos contacts ?`)
      .then(ok => {
        if (ok) {
          this.contactService.removeContact(contact.userId).subscribe({
            next: () => this.loadContacts(),
            error: () => this.modalService.showError('Erreur', 'Impossible de supprimer.')
          });
        }
      });
  }

  // ── Modal ajout ───────────────────────────────────────────
  openAddModal() {
    this.showAddContactModal = true;
    this.resetModalSearch();
  }

  closeAddModal() {
    this.showAddContactModal = false;
    this.resetModalSearch();
  }

  resetModalSearch_internal() { this.resetModalSearch(); }

  private resetModalSearch() {
    this.searchQuery = '';
    this.searchResult = null;
    this.searchResults = [];
    this.searchError = '';
    this.searchMode = 'pseudo';
  }

  search() {
    this.searchResult = null;
    this.searchResults = [];
    this.searchError = '';
    if (!this.searchQuery.trim()) return;

    this.isSearching = true;
    if (this.searchMode === 'pseudo') {
      this.contactService.searchByPseudo(this.searchQuery.trim()).subscribe({
        next: (res) => {
          this.isSearching = false;
          if (res.success && res.users?.length) this.searchResults = res.users;
          else this.searchError = 'Aucun membre trouvé dans votre communauté.';
        },
        error: () => { this.isSearching = false; this.searchError = 'Erreur de recherche.'; }
      });
    } else {
      this.contactService.searchByPhone(this.searchQuery.trim()).subscribe({
        next: (res) => {
          this.isSearching = false;
          if (res.success && res.user) this.searchResult = res.user;
          else this.searchError = res.error || 'Numéro non trouvé sur BelAfrica.';
        },
        error: (err) => {
          this.isSearching = false;
          this.searchError = err.error?.notOnApp
            ? 'Ce numéro n\'est pas inscrit sur BelAfrica.'
            : 'Erreur de recherche.';
        }
      });
    }
  }

  addContact(user: ContactSearchResult) {
    if (user.isAlreadyContact) {
      this.modalService.showError('Déjà ajouté', `${user.pseudo} est déjà dans vos contacts.`);
      return;
    }
    this.isAddingContact = true;
    this.contactService.addContact(user.id).subscribe({
      next: (res) => {
        this.isAddingContact = false;
        this.closeAddModal();
        this.loadContacts();
        this.modalService.showSuccess('Contact ajouté', res.message);
      },
      error: () => {
        this.isAddingContact = false;
        this.modalService.showError('Erreur', 'Impossible d\'ajouter ce contact.');
      }
    });
  }

  getInitials(pseudo: string): string {
    return pseudo?.charAt(0)?.toUpperCase() || '?';
  }

  getLastSeen(contact: Contact): string {
    if (!contact.addedAt) return '';
    const d = new Date(contact.addedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Ajouté aujourd\'hui';
    if (diff === 1) return 'Ajouté hier';
    return `Ajouté il y a ${diff} jours`;
  }
}
