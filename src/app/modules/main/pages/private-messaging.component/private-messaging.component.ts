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
import { UserService } from '../../../../core/services/user.service';

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

  // Recherche
  searchMode: 'phone' | 'pseudo' = 'pseudo';  
  searchPhone = '';
  searchPseudo = '';
  searchResult: ContactSearchResult | null = null;
  searchResults: ContactSearchResult[] = [];  
  searchError = '';

  activeTab: 'conversations' | 'contacts' = 'conversations';

  private subscription = new Subscription();

  constructor(
    private contactService: ContactService,
    private router: Router,
    private modalService: ModalService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadContacts();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadContacts() {
    this.isLoading = true;
    this.subscription.add(
      this.contactService.getContacts().subscribe({
        next: (contacts) => { this.contacts = contacts; this.isLoading = false; },
        error: () => { this.isLoading = false; }
      })
    );
  }

  get contactsWithConversation(): Contact[] {
    return this.contacts.filter(c => c.privateConversationId);
  }

  get contactsWithoutConversation(): Contact[] {
    return this.contacts.filter(c => !c.privateConversationId);
  }

  openChat(contact: Contact) {
    if (contact.privateConversationId) {
      this.router.navigate(['/app/chat', contact.privateConversationId]);
    } else {
      this.startChat(contact);
    }
  }

  startChat(contact: Contact) {
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

  openAddContactModal() {
    this.showAddContactModal = true;
    this.resetSearch();
  }

  closeAddContactModal() {
    this.showAddContactModal = false;
    this.resetSearch();
  }

  private resetSearch(): void {
    this.searchPhone = '';
    this.searchPseudo = '';
    this.searchResult = null;
    this.searchResults = [];
    this.searchError = '';
    this.searchMode = 'pseudo';
  }

  searchContact() {
    this.searchResult = null;
    this.searchResults = [];
    this.searchError = '';

    if (this.searchMode === 'phone') {
      if (!this.searchPhone.trim()) return;
      this.isSearching = true;
      this.contactService.searchByPhone(this.searchPhone.trim()).subscribe({
        next: (res) => {
          this.isSearching = false;
          if (res.success && res.user) {
            this.searchResult = res.user;
          } else {
            this.searchError = res.error || 'Utilisateur non trouvé.';
          }
        },
        error: (err) => {
          this.isSearching = false;
          this.searchError = err.error?.notOnApp
            ? 'Ce numéro n\'est pas inscrit sur BelAfrica.'
            : 'Erreur lors de la recherche.';
        }
      });
    } else {
      if (!this.searchPseudo.trim() || this.searchPseudo.length < 2) {
        this.searchError = 'Entrez au moins 2 caractères.';
        return;
      }
      this.isSearching = true;
      this.contactService.searchByPseudo(this.searchPseudo.trim()).subscribe({
        next: (res) => {
          this.isSearching = false;
          if (res.success && res.users && res.users.length > 0) {
            this.searchResults = res.users;
          } else {
            this.searchError = 'Aucun membre trouvé avec ce pseudo.';
          }
        },
        error: () => {
          this.isSearching = false;
          this.searchError = 'Erreur lors de la recherche.';
        }
      });
    }
  }

  addContactFromResult(user: ContactSearchResult) {
    if (user.isAlreadyContact) {
      this.modalService.showError('Info', 'Ce contact est déjà dans votre liste.');
      return;
    }
    this.isAddingContact = true;
    this.contactService.addContact(user.id).subscribe({
      next: (res) => {
        this.isAddingContact = false;
        this.closeAddContactModal();
        this.loadContacts();
        this.modalService.showError('✅ Contact ajouté', res.message);
      },
      error: () => {
        this.isAddingContact = false;
        this.modalService.showError('Erreur', 'Impossible d\'ajouter ce contact.');
      }
    });
  }

  addFoundContact() {
    if (!this.searchResult) return;
    this.addContactFromResult(this.searchResult);
  }

  confirmRemoveContact(contact: Contact) {
    this.modalService.showConfirm(
      'Supprimer le contact',
      `Supprimer ${contact.pseudo} de vos contacts ?`
    ).then(confirmed => {
      if (confirmed) {
        this.contactService.removeContact(contact.userId).subscribe({
          next: () => this.loadContacts(),
          error: () => this.modalService.showError('Erreur', 'Impossible de supprimer ce contact.')
        });
      }
    });
  }

  getInitials(pseudo: string): string {
    return pseudo?.charAt(0)?.toUpperCase() || '?';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return d.toLocaleDateString('fr-FR');
  }
}
