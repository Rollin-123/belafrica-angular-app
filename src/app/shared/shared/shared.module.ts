/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LogoComponent } from '../components/logo.component/logo.component';
import { ModalComponent } from '../components/modal/modal.component';

@NgModule({
  declarations: [
    LogoComponent,
    ModalComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
  ],
  exports: [
    LogoComponent,
    ModalComponent,
  ]
})
export class SharedModule { }