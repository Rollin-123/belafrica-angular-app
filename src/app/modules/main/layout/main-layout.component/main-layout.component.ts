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
import { SocketService } from '../../../../core/services/socket.service';
import { ModalService } from '../../../../core/services/modal.service';
import { NotificationService } from '../../../../core/services/notification.service';
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
  showCreatePostModal = false;

 constructor(
  private router: Router,
  private userService: UserService,
  private messagingService: MessagingService,
  private socketService: SocketService,
  private modalService: ModalService,
  public notificationService: NotificationService
 ) { }

 ngOnInit() {
    this.userSubscription = this.userService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.socketService.initializeSocket();
        // Demander permission notifications 3s après connexion
        if (this.notificationService.isPushSupported &&
            this.notificationService.permissionStatus === 'default') {
          setTimeout(() => this.notificationService.requestPermission(), 3000);
        }
      }
    });

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateActiveTab(event.urlAfterRedirects);
      });

    this.updateActiveTab(this.router.url);

    this.subscriptions.add(this.messagingService.getConversations().subscribe(conversations => {
      this.unreadCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.userSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
 }

 updateActiveTab(url: string): void {
  if (url.includes('/national')) {
   this.activeTab = 'national';
  } else if (url.includes('/international')) {
   this.activeTab = 'international';
  } else if (url.includes('/messaging') || url.includes('/chat')) {
   this.activeTab = 'messaging';
  } else if (url.includes('/settings')) {
   this.activeTab = 'settings';
  } else {
   this.activeTab = 'national';
  }
 }

 navigateTo(tab: string): void {
  this.activeTab = tab;
  switch(tab) {
   case 'national':    this.router.navigate(['/app/national']); break;
   case 'international': this.router.navigate(['/app/international']); break;
   case 'messaging':   this.router.navigate(['/app/messaging']); break;
   case 'settings':   this.router.navigate(['/app/settings']); break;
  }
 }

 getCurrentTitle(): string {
  const community = this.user?.community || 'Communauté';
  switch(this.activeTab) {
   case 'national':    return community;
   case 'international': return 'Fil International';
   case 'messaging':   return 'Messages';
   case 'settings':   return 'Paramètres';
   default:       return 'BELAFRICA';
  }
 }

 get isUserAdmin(): boolean {
  return this.userService.isUserAdmin();
 }

 get showFabButton(): boolean {
  if (!this.userService.isUserAdmin()) return false;
  if (this.activeTab === 'national' && this.userService.canPostNational()) return true;
  if (this.activeTab === 'international' && this.userService.canPostInternational()) return true;
  return false;
 }

 openCreatePostModal(): void {
    if (this.showFabButton) this.showCreatePostModal = true;
 }

 closeCreatePostModal(): void {
  this.showCreatePostModal = false;
 }

 onPostCreated(): void {
  this.closeCreatePostModal();
 }
}