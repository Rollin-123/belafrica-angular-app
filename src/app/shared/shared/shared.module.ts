import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../components/logo.component/logo.component';
import { NavigationComponent } from '../../modules/main/components/navigation.component/navigation.component';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../modules/main/components/header.component/header.component';



@NgModule({
  declarations: [
    LogoComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    LogoComponent
  ]
})
export class SharedModule { }
