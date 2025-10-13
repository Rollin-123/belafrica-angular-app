import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const routes: Routes = [
  {
  path: '',
  redirectTo: 'auth/phone',
  pathMatch: 'full'
},
{
  path: 'auth',
  loadChildren: ()=> import('./modules/auth/auth.module').then(m => m.AuthModule),
  // canActivate: [AuthGuard]
},
// {
//   path: 'app',
//   loadChildren: ()=> import('./modules/main/main.module').then(m => m.MainModule),
// },

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