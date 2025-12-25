// src/app/modules/auth/auth.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // Gardez ReactiveFormsModule

import { AuthRoutingModule } from './auth-routing.module';

// Composants
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
    ReactiveFormsModule, // Gardez ReactiveFormsModule
    AuthRoutingModule,
    SharedModule
]
})
export class AuthModule { }