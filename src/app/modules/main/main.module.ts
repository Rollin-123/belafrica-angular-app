import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainRoutingModule } from './main-routing.module';
import { SharedModule } from '../../shared/shared/shared.module';
import { FeedComponent } from './pages/feed.component/feed.component';
import { MessagesComponent } from './pages/messages.component/messages.component';
import { SettingsComponent } from './pages/settings.component/settings.component';
import { CommunityComponent } from './pages/community.component/community.component';
import { MainLayoutComponent } from './pages/main-layout.component/main-layout.component';
import { NavigationComponent } from './components/navigation.component/navigation.component';
import { HeaderComponent } from './components/header.component/header.component';


@NgModule({
  declarations: [
    MainLayoutComponent,
    FeedComponent,
    MessagesComponent,
    SettingsComponent,
    CommunityComponent,
    NavigationComponent,
    HeaderComponent
  ],
  imports: [
    CommonModule,
    MainRoutingModule,
    SharedModule
  ]
})
export class MainModule { }
