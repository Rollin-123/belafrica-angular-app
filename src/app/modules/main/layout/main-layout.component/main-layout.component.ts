import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserService } from '../../../../core/services/user.service';
import { AdminService } from '../../../../core/services/admin.service'; // <-- NOUVEAU

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
  private userService: UserService,
  private adminService: AdminService // <-- NOUVEAU: Injection du service admin
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

 showCreatePostModal = false;

 // Remplacé par showFabButton
 get isUserAdmin(): boolean {
  return this.userService.canUserPost();
 }

 // 🆕 NOUVEAU: Logique pour afficher le FAB
 get showFabButton(): boolean {
  // 1. Vérifier si l'utilisateur est admin (général)
  if (!this.adminService.isUserAdmin()) {
   return false;
  }

  // 2. Vérifier si l'utilisateur est sur l'onglet National ET a la permission Nationale
  if (this.activeTab === 'national' && this.adminService.canPostNational()) {
   return true;
  }

  // 3. Vérifier si l'utilisateur est sur l'onglet International ET a la permission Internationale
  if (this.activeTab === 'international' && this.adminService.canPostInternational()) {
   return true;
  }
  
  // Masquer le bouton sur les autres onglets (messaging, settings) ou si les permissions ne correspondent pas.
  return false;
 }

 openCreatePostModal(): void {
  // On pourrait passer ici l'onglet actif pour pré-sélectionner le type de post
  console.log(`Ouverture de la modale de post pour l'onglet: ${this.activeTab}`);
  this.showCreatePostModal = true;
 }

 closeCreatePostModal(): void {
  this.showCreatePostModal = false;
 }

 onPostCreated(): void {
  // Logique de rechargement/mise à jour du fil
  this.closeCreatePostModal();
 }

 // Actions header (laissé tel quel)
 onSearch(): void {
  console.log('Recherche activée');
 }

 onMenu(): void {
  console.log('Menu activé');
 }
}