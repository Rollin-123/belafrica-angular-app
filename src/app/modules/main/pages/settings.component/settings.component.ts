import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService, User } from '../../../../core/services/user.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: false
})
export class SettingsComponent implements OnInit {
  user: User | null = null;
  
  settingsSections = [
    {
      id: 'profile',
      title: 'Profil',
      description: 'Gérez vos informations personnelles',
      icon: '👤',
      route: '/app/profile',
      badge: null
    },
    {
      id: 'privacy',
      title: 'Confidentialité & Sécurité',
      description: 'Contrôlez votre vie privée et sécurité',
      icon: '🔐',
      route: '/app/settings/privacy',
      badge: null
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Gérez vos préférences de notifications',
      icon: '🔔',
      route: '/app/settings/notifications',
      badge: null
    },
    {
      id: 'appearance',
      title: 'Apparence',
      description: 'Thème clair/sombre et interface',
      icon: '🎨',
      route: null,
      badge: 'Bientôt',
      disabled: true
    },
    {
      id: 'messaging',
      title: 'Messagerie',
      description: 'Paramètres des conversations',
      icon: '💬',
      route: null,
      badge: 'Bientôt',
      disabled: true
    },
    {
      id: 'language',
      title: 'Langue & Région',
      description: 'Langue et paramètres régionaux',
      icon: '🌍',
      route: null,
      badge: 'Bientôt',
      disabled: true
    }
  ];

  criticalActions = [
    {
      id: 'logout',
      title: 'Déconnexion',
      description: 'Se déconnecter de votre compte',
      icon: '🚪',
      action: () => this.logout(),
      color: 'danger'
    }
  ];

  constructor(
    public userService: UserService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.user = this.userService.getCurrentUser();
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

  logout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      this.userService.logout();
      this.router.navigate(['/auth']);
    }
  }

  getUserInitials(): string {
    return this.user?.pseudo?.charAt(0).toUpperCase() || 'U';
  }

  // ✅ FORMATER LA DATE DE CRÉATION
  getMemberSince(): string {
    if (!this.user?.createdAt) return 'Récemment';
    
    const created = new Date(this.user.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Aujourd\'hui';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  }
}