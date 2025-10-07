import { ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing.module';
import { PhoneVerificationComponent } from './pages/phone-verification.component/phone-verification.component';
import { OtpVerificationComponent } from './pages/otp-verification.component/otp-verification.component';
import { NationalitySelectionComponent } from './pages/nationality-selection.component/nationality-selection.component';
import { ProfileSetupComponent } from './pages/profile-setup.component/profile-setup.component';
import { LogoComponent } from '../../shared/components/logo.component/logo.component';
import { SharedModule } from '../../shared/shared/shared.module';


@NgModule({
  declarations: [
    PhoneVerificationComponent,
    OtpVerificationComponent,
    NationalitySelectionComponent,
    ProfileSetupComponent,
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class AuthModule { }
