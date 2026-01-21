// src/app/modules/auth/auth.module.ts
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';  

import { AuthRoutingModule } from './auth-routing.module';

import { PhoneVerificationComponent } from './pages/phone-verification.component/phone-verification.component';
import { OtpVerificationComponent } from './pages/otp-verification.component/otp-verification.component';
import { NationalitySelectionComponent } from './pages/nationality-selection.component/nationality-selection.component';
import { ProfileSetupComponent } from './pages/profile-setup.component/profile-setup.component';
import { SharedModule } from "../../shared/shared/shared.module";

@NgModule({
  declarations: [
    PhoneVerificationComponent,
    OtpVerificationComponent,
    NationalitySelectionComponent,
    ProfileSetupComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,  
    AuthRoutingModule,
    SharedModule
]
})
export class AuthModule { }