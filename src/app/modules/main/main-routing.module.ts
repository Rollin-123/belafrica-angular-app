import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component/main-layout.component';
import { FeedNationalComponent } from './pages/feed-national.component/feed-national.component';
import { FeedInternationalComponent } from './pages/feed-international.component/feed-international.component';
import { MessagingComponent } from './pages/messaging.component/messaging.component';
import { SettingsComponent } from './pages/settings.component/settings.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {path: '', redirectTo: 'national', pathMatch: 'full'},
      {path: 'national', component: FeedNationalComponent},
      {path: 'international', component: FeedInternationalComponent},
      {path: 'messaging', component: MessagingComponent},
      {path: 'settings', component: SettingsComponent},
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }
