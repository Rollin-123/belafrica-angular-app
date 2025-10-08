import { NgModule } from '@angular/core';
import { RouterModule, Routes, CanActivate } from '@angular/router';
import { FeedComponent } from './pages/feed.component/feed.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { SettingsComponent } from './pages/settings.component/settings.component';
import { MessagesComponent } from './pages/messages.component/messages.component';
import { CommunityComponent } from './pages/community.component/community.component';
import { MainLayoutComponent } from './pages/main-layout.component/main-layout.component';

const routes: Routes = [
  {
    path:'',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path:'',
        component: FeedComponent,
      },
      {
  path:'community',
  component: CommunityComponent,
},
{
  path:'messages',
  component: MessagesComponent,
},
{
  path:'settings',
  component: SettingsComponent,
}
    ],
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }
