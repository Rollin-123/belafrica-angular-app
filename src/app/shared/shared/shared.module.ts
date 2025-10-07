import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../components/logo.component/logo.component';



@NgModule({
  declarations: [
    LogoComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LogoComponent
  ]
})
export class SharedModule { }
