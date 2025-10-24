import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminCodeGeneratorComponent } from './pages/admin-code-generator.component/admin-code-generator.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';


@NgModule({
  declarations: [
    AdminCodeGeneratorComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ReactiveFormsModule
  ]
})
export class AdminModule { }
