import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path:'app',
    canActivate: [AuthGuard],
    loadChildren: () => import('./modules/main/main.module').then(m => m.MainModule)
  },
   // Route par défaut (redirige l'utilisateur non connecté vers la page d'inscription/connexion)
  { path: '', redirectTo: 'auth/phone', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/phone' }
  // Autres routes...
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }