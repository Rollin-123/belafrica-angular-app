import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminCodeGeneratorComponent } from './pages/admin-code-generator.component/admin-code-generator.component';

const routes: Routes = [
   {
    path: 'generator', 
    component: AdminCodeGeneratorComponent
  },
  {
    path: '',
    redirectTo: 'generator',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
