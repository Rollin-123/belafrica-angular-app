/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhoneVerificationComponent } from './pages/phone-verification.component/phone-verification.component';
import { OtpVerificationComponent } from './pages/otp-verification.component/otp-verification.component';
import { NationalitySelectionComponent } from './pages/nationality-selection.component/nationality-selection.component';
import { ProfileSetupComponent } from './pages/profile-setup.component/profile-setup.component';
import { TelegramRedirectComponent } from './telegram-redirect.component';

const routes: Routes = [
  {path:'', redirectTo:'phone', pathMatch:'full'},
  {path:'phone', component:PhoneVerificationComponent, data: { title: 'Vérification Téléphone'}},
  {path:'otp', component:OtpVerificationComponent, data: { title: 'Vérification OTP' }},
  {path:'nationality', component:NationalitySelectionComponent, data: { title: 'Sélection Nationalité' }},
  {path:'profile', component:ProfileSetupComponent,data: { title: 'Création Profil' }},
  { path: 'telegram-redirect', component: TelegramRedirectComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
