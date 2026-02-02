/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainRoutingModule } from './main-routing.module';
import { MainLayoutComponent } from './layout/main-layout.component/main-layout.component';
import { FeedInternationalComponent } from './pages/feed-international.component/feed-international.component';
import { MessagingComponent } from './pages/messaging.component/messaging.component';
import { SettingsComponent } from './pages/settings.component/settings.component';
import { SharedModule } from '../../shared/shared/shared.module';
import { FeedNationalComponent } from './pages/feed-national.component/feed-national.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileComponent } from './pages/profile.component/profile.component';
import { AdminRequestComponent } from './pages/admin-request.component/admin-request.component';
import { CreatePostModalComponent } from './pages/create-post-modal.component/create-post-modal.component';
import { provideHttpClient } from '@angular/common/http';
import { ModalService } from '../../core/services/modal.service';
import { MessageBubbleComponent } from './components/message-bubble/message-bubble.component';


@NgModule({
  declarations: [
    MainLayoutComponent,
    FeedInternationalComponent,
    FeedNationalComponent,
    MessagingComponent,
    SettingsComponent,
    ProfileComponent,
    AdminRequestComponent,
    CreatePostModalComponent,
    MessageBubbleComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MessageBubbleComponent,
    MainRoutingModule,
    ReactiveFormsModule,
    SharedModule
  ],
   providers: [
    provideHttpClient(),
    ModalService
  ]
})
export class MainModule {}