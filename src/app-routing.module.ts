/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './app/core/guards/auth.guard';
import { CreatorGuard } from './app/core/guards/creator.guard';

export const routes: Routes = [
{
  path: '',
  redirectTo: 'auth/phone',
  pathMatch: 'full'
},
{
  path: 'auth',
 loadChildren: () => import('./app/modules/auth/auth.module').then(m => m.AuthModule),
},
{
  path: 'app',
  loadChildren: ()=> import('./app/modules/main/main.module').then(m => m.MainModule),
  canActivate: [AuthGuard]
},
// http://localhost:4200/admin-generator
{ 
  path: 'admin', 
  loadChildren: ()=> import('./app/modules/admin/admin.module').then(m => m.AdminModule),
  canActivate: [CreatorGuard]
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