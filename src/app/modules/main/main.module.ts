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
  ],
  imports: [
    CommonModule,
    FormsModule,
    MainRoutingModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class MainModule { }
