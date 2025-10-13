import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../../../core/services/storage.service';

@Component({
  selector: 'app-phone-verification',
  standalone: false,
  templateUrl: './phone-verification.component.html',
  styleUrls: ['./phone-verification.component.scss']
})
export class PhoneVerificationComponent {
  phoneForm: FormGroup;
  isLoading: boolean = false;
  
  // Liste des pays européens cibles
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
    { name: 'Russie', code: '+7' }
  ];

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private storageService: StorageService
  ) {
    this.phoneForm = this.fb.group({
      countryCode: [this.europeanCountries[0].code, Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s]{8,15}$/)]]
    });
  }

  validateNumber(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    
    if (
      (charCode >= 48 && charCode <= 57) || // Chiffres 0-9
      charCode === 8 || // Backspace
      charCode === 9 || // Tab
      charCode === 37 || // Flèche gauche
      charCode === 39 || // Flèche droite
      charCode === 46 // Delete
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

      // Stocker les données
      const phoneData = {
        phoneNumber: formValue.phoneNumber.replace(/\s/g, ''),
        countryCode: formValue.countryCode,
        countryName: this.getCountryName(formValue.countryCode)
      };
      
      this.storageService.setItem('tempPhone', phoneData);

      // Simulation envoi OTP
      setTimeout(() => {
        this.isLoading = false;
        alert(`Code OTP envoyé (MOCK). Utilisez le code 123456.`);
        
        // Naviguer vers OTP
        this.router.navigate(['/auth/otp']); 
      }, 1500); 
    }
  }

  private getCountryName(code: string): string {
    const countries: {[key: string]: string} = {
      '+33': 'France',
      '+32': 'Belgique', 
      '+49': 'Allemagne',
      '+39': 'Italie',
      '+34': 'Espagne',
      '+41': 'Suisse',
      '+44': 'Royaume-Uni',
      '+1': 'Canada',
      '+7': 'Russie',
      '+375': 'Biélorussie'
    };
    return countries[code] || 'Inconnu';
  }
}