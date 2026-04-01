/*
 * BELAFRICA - MessagingSettingsComponent
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService } from '../../../../../core/services/settings.service';

@Component({
  selector: 'bel-messaging-settings',
  standalone: false,
  templateUrl: './messaging-settings.component.html',
  styleUrl: './messaging-settings.component.scss'
})
export class MessagingSettingsComponent implements OnInit {
  mentionNotifications = true;
  autoSaveMedia = false;
  enterToSend = true;
  showReadReceipts = true;

  constructor(
    private router: Router,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    const s = this.settingsService.getSettings();
    this.showReadReceipts = s.privacyReadReceipts;
  }

  goBackToSettings(): void { this.router.navigate(['/app/settings']); }

  saveReadReceipts(): void {
    this.settingsService.savePrivacySettings({
      privacyLastSeen: this.settingsService.getSettings().privacyLastSeen,
      privacyReadReceipts: this.showReadReceipts
    }).subscribe();
  }
}
