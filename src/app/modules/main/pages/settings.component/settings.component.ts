/* 
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
 */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService, User } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { ModalService } from '../../../../core/services/modal.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: false
})
export class SettingsComponent implements OnInit, OnDestroy {
  user: User | null = null;
  private userSubscription: Subscription | undefined;

  settingsSections = [
    {
      id: 'profile',
      title: 'Profil',
      description: 'Gérez vos informations personnelles',
      icon: '👤',
      route: '/app/profile',
      badge: null,
      disabled: false
    },
    {
      id: 'privacy',
      title: 'Confidentialité & Sécurité',
      description: 'Contrôlez votre vie privée et sécurité',
      icon: '🔐',
      route: '/app/settings/privacy',
      badge: null,
      disabled: false
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Gérez vos préférences de notifications',
      icon: '🔔',
      route: '/app/settings/notifications',  
      badge: null,
      disabled: false   
    },
    {
      id: 'messaging',
      title: 'Messagerie',
      description: 'Options de messagerie',
      icon: '💬',
      route: '/app/settings/messaging',  
      badge: null,
      disabled: false  
    },
    {
      id: 'appearance',
      title: 'Apparence',
      description: 'Thème clair/sombre et interface',
      icon: '🎨',
      route: '/app/settings/appearance',
      badge: null,
      disabled: false
    },
    {
      id: 'language',
      title: 'Langue & Région',
      description: 'Langue et paramètres régionaux',
      icon: '🌍',
      route: '/app/settings/language',
      badge: null,
      disabled: false
    }
  ];

  constructor(
    public userService: UserService,
    private authService: AuthService,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  navigateToSection(section: any): void {
    if (section.disabled) return;
    if (section.route) {
      this.router.navigate([section.route]);
    } else if (section.action) {
      section.action();
    }
  }

  navigateToAdminRequest(): void {
    this.router.navigate(['/app/admin-request']);
  }

  /**
   * Affiche le menu de déconnexion avec 3 options
   */
  showLogoutOptions(): void {
    // On utilise un confirm en cascade pour simuler un menu
    // (ou vous pouvez brancher un vrai modal multi-options)
    this.modalService.showConfirm(
      '🚪 Déconnexion',
      'Que souhaitez-vous faire ?\n\n' +
      '• OUI → Déconnexion simple (vous pouvez vous reconnecter avec le même numéro)\n\n' +
      '• NON → Voir d\'autres options (changer de numéro / réinitialiser)'
    ).then(simpleLogout => {
      if (simpleLogout) {
        this.authService.logout();
        this.router.navigate(['/auth/phone']);
      } else {
        this.showAdvancedLogoutOptions();
      }
    });
  }

  private showAdvancedLogoutOptions(): void {
    this.modalService.showConfirm(
      '🔄 Changer de numéro',
      'Avez-vous perdu votre numéro et souhaitez vous réinscrire en GARDANT la même communauté ?\n\n' +
      '• OUI → Réinscription (communauté conservée)\n' +
      '• NON → Réinitialisation complète (tout effacer)'
    ).then(keepCommunity => {
      if (keepCommunity) {
        this.modalService.showConfirm(
          '🔄 Confirmer',
          'Votre communauté, nationalité et pays de résidence seront pré-remplis lors de la réinscription. Continuer ?'
        ).then(confirmed => {
          if (confirmed) {
            this.authService.logoutChangeNumber();
            this.router.navigate(['/auth/phone']);
          }
        });
      } else {
        this.modalService.showConfirm(
          '⚠️ Réinitialisation complète',
          'Toutes vos données locales seront effacées. Vous repartirez de zéro avec un nouveau numéro et une nouvelle communauté. Confirmer ?'
        ).then(confirmed => {
          if (confirmed) {
            this.authService.logoutFull();
            this.router.navigate(['/auth/phone']);
          }
        });
      }
    });
  }

  getUserInitials(): string {
    return this.user?.pseudo?.charAt(0).toUpperCase() || 'U';
  }

  getMemberSince(): string {
    if (!this.user?.created_at) return 'Récemment';
    const created = new Date(this.user.created_at);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Aujourd\'hui';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  }
}