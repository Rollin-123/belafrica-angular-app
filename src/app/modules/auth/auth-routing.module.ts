import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhoneVerificationComponent } from './pages/phone-verification.component/phone-verification.component';
import { OtpVerificationComponent } from './pages/otp-verification.component/otp-verification.component';
import { NationalitySelectionComponent } from './pages/nationality-selection.component/nationality-selection.component';
import { ProfileSetupComponent } from './pages/profile-setup.component/profile-setup.component';

const routes: Routes = [
  {path:' ', redirectTo:'phone', pathMatch:'full'},
  {path:'phone', component:PhoneVerificationComponent},
  {path:'otp', component:OtpVerificationComponent},
  {path:'nationality', component:NationalitySelectionComponent},
  {path:'profile', component:ProfileSetupComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
