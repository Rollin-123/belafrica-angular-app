import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-phone-verification',
  standalone: false,
  templateUrl: './phone-verification.component.html',
  styleUrls: ['./phone-verification.component.scss']
})
export class PhoneVerificationComponent {
  phoneForm: FormGroup;
  isLoading: boolean = false;
  isPendingPhoneChange: boolean = false;
  
  // Liste des pays européens cibles (simplifiée pour le front-end)
  europeanCountries = [
    { name: 'Allemagne', code: '+49' },
    { name: 'Belgique', code: '+32' },
    { name: 'Biélorussie', code: '+375' },
    { name: 'Canada', code: '+1' },
    { name: 'Espagne', code: '+34' },
    { name: 'France', code: '+33' },
    { name: 'Italie', code: '+39' },
    { name: 'Suisse', code: '+41' },
    { name: 'Royaume-Uni', code: '+44' },
    { name: 'Russie', code: '+7' },
    // Ajout d'autres pays cibles ici si nécessaire
  ];
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.phoneForm = this.fb.group({
      countryCode: [this.europeanCountries[0].code, Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s]{8,15}$/)]]
    });
  }

    ngOnInit() {
    // Vérifier si c'est un changement de numéro en attente
    this.isPendingPhoneChange = this.authService.isPendingPhoneChange();
    
    if (this.isPendingPhoneChange) {
      console.log('🔄 Mode changement de numéro détecté');
      this.authService.clearPendingPhoneChange();
    }
  }

  onSubmit() {
    if (this.phoneForm.valid) {
      this.isLoading = true;
      
      const formValue = this.phoneForm.value;
      const fullPhoneNumber = `${formValue.countryCode}${formValue.phoneNumber.replace(/\s/g, '')}`;

      // 🎯 LOGIQUE AMÉLIORÉE
      if (this.authService.isPhoneNumberKnown(fullPhoneNumber)) {
        this.handleReconnection(fullPhoneNumber, formValue);
      } else if (this.isPendingPhoneChange) {
        this.handlePhoneChange(fullPhoneNumber, formValue);
      } else {
        this.handleNewRegistration(formValue);
      }
    }
  }

  // 🔄 RECONNEXION (même numéro, même communauté)
  private handleReconnection(fullPhoneNumber: string, phoneData: any) {
    console.log('🔄 Reconnexion détectée');
    
    localStorage.setItem('tempPhone', JSON.stringify({
      ...phoneData,
      fullPhoneNumber
    }));
    localStorage.setItem('isReconnection', 'true');

    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/auth/nationality']);
    }, 1500);
  }

  // 📞 CHANGEMENT DE NUMÉRO (même profil, nouvelle communauté)
  private handlePhoneChange(fullPhoneNumber: string, phoneData: any) {
    console.log('📞 Changement de numéro');
    
    localStorage.setItem('tempPhone', JSON.stringify({
      ...phoneData,
      fullPhoneNumber
    }));
    localStorage.setItem('isPhoneChange', 'true');

    setTimeout(() => {
      this.isLoading = false;
      // ⚠️ PAS besoin de resélectionner la nationalité - elle est immuable !
      this.authService.changePhoneNumber({
        ...phoneData,
        fullPhoneNumber
      });
    }, 1500);
  }

  // ✅ NOUVELLE INSCRIPTION
  private handleNewRegistration(phoneData: any) {
    console.log('✅ Nouvelle inscription');
    
    localStorage.setItem('tempPhone', JSON.stringify(phoneData));
    localStorage.setItem('isReconnection', 'false');

    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/auth/otp']);
    }, 1500);
  }

}