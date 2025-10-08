import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  currentUser: any;
  userCommunity: string = '';
  notificationCount: number = 0;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.userCommunity = this.authService.getUserCommunity();
    this.notificationCount = 3; // Mock pour l'instant
  }

  toggleNotifications() {
    console.log('📢 Ouvrir les notifications');
    // À implémenter plus tard
  }
}