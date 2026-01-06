/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MessagingService } from '../../../../core/services/messaging.service';
import { User, UserService } from '../../../../core/services/user.service';
import { Subscription } from 'rxjs';

@Component({
 selector: 'app-main-layout',
 standalone: false,
 templateUrl: './main-layout.component.html',
 styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
 activeTab: string = 'national';
 unreadCount: number = 0; 
  user: User | null = null;
  private userSubscription: Subscription | undefined;
  private subscriptions: Subscription = new Subscription(); 
  private routerSubscription: Subscription | undefined;

 constructor(
  private router: Router,
  private userService: UserService, 
  private messagingService: MessagingService,
 ) { }

 ngOnInit() {
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      this.user = user;
    });

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateActiveTab(event.urlAfterRedirects);
      });

    this.updateActiveTab(this.router.url);

    // ✅ S'abonner au nombre de messages non lus
    this.subscriptions.add(this.messagingService.getConversations().subscribe(conversations => {
      this.unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe(); 
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
  const community = this.user?.community || 'Communauté';
  
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
  return this.userService.isUserAdmin();
 }
 // 🆕 NOUVEAU: Logique pour afficher le FAB
 get showFabButton(): boolean {
  // 1. Vérifier si l'utilisateur est admin (général)
  if (!this.userService.isUserAdmin()) {
   return false;
  }

  // 2. Vérifier si l'utilisateur est sur l'onglet National ET a la permission Nationale
  if (this.activeTab === 'national' && this.userService.canPostNational()) {
   return true;
  }

  // 3. Vérifier si l'utilisateur est sur l'onglet International ET a la permission Internationale
  if (this.activeTab === 'international' && this.userService.canPostInternational()) {
   return true;
  }
    return false;
 }

 openCreatePostModal(): void {
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
}