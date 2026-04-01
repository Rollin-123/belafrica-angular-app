/*
 * BELAFRICA - NotificationSettingsComponent
 * Préférences de notifications (persistées en localStorage)
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService } from '../../../../../core/services/settings.service';

@Component({
  selector: 'bel-notification-settings',
  standalone: false,
  templateUrl: './notification-settings.component.html',
  styleUrl: './notification-settings.component.scss'
})
export class NotificationSettingsComponent implements OnInit {
  notificationsEnabled = true;
  notificationSound = true;
  notificationVibration = true;
  notifyPrivateMessages = true;
  notifyGroupMessages = true;
  notifyNewPosts = false;

  constructor(
    private router: Router,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    const s = this.settingsService.getSettings();
    this.notificationsEnabled = s.notificationsEnabled;
    this.notificationSound = s.notificationSound;
    this.notificationVibration = s.notificationVibration;
  }

  goBackToSettings(): void { this.router.navigate(['/app/settings']); }

  toggle(field: 'notificationsEnabled' | 'notificationSound' | 'notificationVibration'): void {
    (this as any)[field] = !(this as any)[field];
    this.settingsService.updateSettings({ [field]: (this as any)[field] });
  }
}
