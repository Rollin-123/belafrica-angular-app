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
  searchPhone = '';
  searchResult: ContactSearchResult | null = null;
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
        next: (contacts) => {
          this.contacts = contacts;
          this.isLoading = false;
        },
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
        this.modalService.showError('Erreur', 'Impossible de demarrer la conversation.');
      }
    });
  }

  openAddContactModal() {
    this.showAddContactModal = true;
    this.searchPhone = '';
    this.searchResult = null;
    this.searchError = '';
  }

  closeAddContactModal() {
    this.showAddContactModal = false;
    this.searchPhone = '';
    this.searchResult = null;
    this.searchError = '';
  }

  searchContact() {
    if (!this.searchPhone.trim()) return;
    this.isSearching = true;
    this.searchResult = null;
    this.searchError = '';

    this.contactService.searchByPhone(this.searchPhone.trim()).subscribe({
      next: (res) => {
        this.isSearching = false;
        if (res.success && res.user) {
          this.searchResult = res.user;
        } else {
          this.searchError = res.error || 'Utilisateur non trouve.';
        }
      },
      error: (err) => {
        this.isSearching = false;
        if (err.error?.notOnApp) {
          this.searchError = 'Ce numero n\'est pas inscrit sur BelAfrica.';
        } else {
          this.searchError = 'Erreur lors de la recherche.';
        }
      }
    });
  }

  addFoundContact() {
    if (!this.searchResult) return;
    this.isAddingContact = true;

    this.contactService.addContact(this.searchResult.id).subscribe({
      next: (res) => {
        this.isAddingContact = false;
        this.closeAddContactModal();
        this.loadContacts();
        this.modalService.showError('Contact ajoute', res.message);
      },
      error: () => {
        this.isAddingContact = false;
        this.modalService.showError('Erreur', 'Impossible d\'ajouter ce contact.');
      }
    });
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
    if (diffDays < 7) return 'Il y a ' + diffDays + ' jours';
    return d.toLocaleDateString('fr-FR');
  }
}
