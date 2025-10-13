import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-main-layout',
  standalone: false,
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  activeTab: string = 'national';
  unreadCount: number = 3; // Temporaire - à connecter avec le service de messages

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Détecter l'onglet actif basé sur la route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateActiveTab(event.urlAfterRedirects);
      });

    // Initialiser l'onglet actif
    this.updateActiveTab(this.router.url);
  }

  // Mettre à jour l'onglet actif selon la route
  updateActiveTab(url: string): void {
    if (url.includes('/national')) {
      this.activeTab = 'national';
    } else if (url.includes('/international')) {
      this.activeTab = 'international';
    } else if (url.includes('/messaging')) {
      this.activeTab = 'messaging';
    } else if (url.includes('/settings')) {
      this.activeTab = 'settings';
    } else {
      this.activeTab = 'national'; // Par défaut
    }
  }

  // Navigation entre onglets
  navigateTo(tab: string): void {
    this.activeTab = tab;
    switch(tab) {
      case 'national':
        this.router.navigate(['/app/national']);
        break;
      case 'international':
        this.router.navigate(['/app/international']);
        break;
      case 'messaging':
        this.router.navigate(['/app/messaging']);
        break;
      case 'settings':
        this.router.navigate(['/app/settings']);
        break;
    }
  }

  // Titre dynamique du header
  getCurrentTitle(): string {
    const user = this.userService.getCurrentUser();
    const community = user?.community || 'Communauté';
    
    switch(this.activeTab) {
      case 'national':
        return community;
      case 'international':
        return 'Fil International';
      case 'messaging':
        return 'Messages';
      case 'settings':
        return 'Paramètres';
      default:
        return 'BELAFRICA';
    }
  }

  // Actions header
  onSearch(): void {
    console.log('Recherche activée');
    // Implémenter la recherche
  }

  onMenu(): void {
    console.log('Menu activé');
    // Implémenter le menu contextuel
  }
}