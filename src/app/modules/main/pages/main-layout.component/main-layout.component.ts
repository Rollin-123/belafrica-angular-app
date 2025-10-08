import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'bel-main-layout.component',
  standalone: false,
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  currentUser: any;
  userCommunity: string = '';
  notificationCount: number = 3; // Mock

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.userCommunity = this.authService.getUserCommunity();
  }

  toggleNotifications() {
    console.log('📢 Ouvrir les notifications');
  }

  onLogout(): void {
      this.authService.logout();
  }
}