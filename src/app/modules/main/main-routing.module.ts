import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component/main-layout.component';
import { FeedNationalComponent } from './pages/feed-national.component/feed-national.component';
import { FeedInternationalComponent } from './pages/feed-international.component/feed-international.component';
import { MessagingComponent } from './pages/messaging.component/messaging.component';
import { SettingsComponent } from './pages/settings.component/settings.component';
import { ChatComponent } from './pages/chat.component/chat.component';
import { ProfileComponent } from './pages/profile.component/profile.component';
import { PrivacySettingsComponent } from './pages/privacy-settings.component/privacy-settings.component';
import { NotificationSettingsComponent } from './pages/notification-settings.component/notification-settings.component';
import { AdminRequestComponent } from './pages/admin-request.component/admin-request.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {path: '', redirectTo: 'national', pathMatch: 'full'},
      {path: 'national', component: FeedNationalComponent},
      {path: 'international', component: FeedInternationalComponent},
      {path: 'messaging', component: MessagingComponent},
      {path: 'chat/:conversationId', component: ChatComponent, data: { preload: false }},
      {path: 'profile', component: ProfileComponent},
      {path: 'settings', component: SettingsComponent},
      {path: 'settings/privacy', component: PrivacySettingsComponent }, 
      {path: 'settings/notifications', component: NotificationSettingsComponent },
      {path: 'admin-request', component: AdminRequestComponent}
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }