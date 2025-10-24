import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { CreatorGuard } from './core/guards/creator.guard';

export const routes: Routes = [
  {
  path: '',
  redirectTo: 'auth/phone',
  pathMatch: 'full'
},
{
  path: 'auth',
  loadChildren: ()=> import('./modules/auth/auth.module').then(m => m.AuthModule),
},
{
  path: 'app',
  loadChildren: ()=> import('./modules/main/main.module').then(m => m.MainModule),
  canActivate: [AuthGuard]
},
// http://localhost:4200/admin-generator
{ 
  path: 'admin', 
  loadChildren: ()=> import('./modules/admin/admin.module').then(m => m.AdminModule),
  // canActivate: [CreatorGuard]
},

//Routes de page not found 
{
  path: '**',
  redirectTo: 'auth/phone'
}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }