import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainRoutingModule } from './main-routing.module';
import { MainLayoutComponent } from './layout/main-layout.component/main-layout.component';
import { FeedInternationalComponent } from './pages/feed-international.component/feed-international.component';
import { FeedNationalComponent } from './pages/feed-national.component/feed-national.component';
import { MessagingComponent } from './pages/messaging.component/messaging.component';
import { SettingsComponent } from './pages/settings.component/settings.component';
import { SharedModule } from '../../shared/shared/shared.module';


@NgModule({
  declarations: [
    MainLayoutComponent,
    FeedInternationalComponent,
    FeedNationalComponent,
    MessagingComponent,
    SettingsComponent
  ],
  imports: [
    CommonModule,
    MainRoutingModule,
    SharedModule
  ]
})
export class MainModule { }
