import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-phone-verification',
  standalone: false,
  templateUrl: './phone-verification.component.html',
  styleUrls: ['./phone-verification.component.scss']
})
export class PhoneVerificationComponent {
  phoneForm: FormGroup;
  isLoading: boolean = false;
  
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

  constructor(private fb: FormBuilder, private router: Router) {
    this.phoneForm = this.fb.group({
      countryCode: [this.europeanCountries[0].code, Validators.required], 
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s]{8,15}$/)]] 
    });
  }

  validateNumber(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    
    if (
      (charCode >= 48 && charCode <= 57) || 
      charCode === 8 || 
      charCode === 9 || 
      charCode === 37 || 
      charCode === 39 || 
      charCode === 46 
    ) {
      return true;
    }
    
    event.preventDefault();
    return false;
  }

  onSubmit() {
    if (this.phoneForm.valid) {
      this.isLoading = true;
      const formValue = this.phoneForm.value;
      
      const fullPhoneNumber = `${formValue.countryCode}${formValue.phoneNumber.replace(/\s/g, '')}`;

      console.log('Tentative de vérification pour:', fullPhoneNumber);

      // --- MOCK : Appel au service OTP (simulé) ---
      // Simuler le délai de la requête
      setTimeout(() => {
        this.isLoading = false;
        alert(`Code OTP envoyé (MOCK). Utilisez le code 123456.`);
        
        // Stocker temporairement les données pour l'étape suivante (MOCK)
        localStorage.setItem('tempPhone', JSON.stringify(formValue));

        // Naviguer vers l'étape de vérification OTP
        this.router.navigate(['/auth/otp']); 
      }, 1500); 
    }
  }
}