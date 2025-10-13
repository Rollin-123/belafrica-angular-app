import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, PhoneValidationResult } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-phone-verification',
  standalone: false,
  templateUrl: './phone-verification.component.html',
  styleUrls: ['./phone-verification.component.scss']
})
export class PhoneVerificationComponent implements OnInit {
  phoneForm: FormGroup;
  isLoading: boolean = false;
  isPendingPhoneChange: boolean = false;
  
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
    this.isPendingPhoneChange = this.authService.isPendingPhoneChange();
    
    if (this.isPendingPhoneChange) {
      console.log('🔄 Mode changement de numéro détecté');
    }
  }

  onSubmit() {
    if (this.phoneForm.valid) {
      this.isLoading = true;
      
      const formValue = this.phoneForm.value;
      
      // 🎯 VALIDATION INTELLIGENTE
      const validationResult = this.authService.validatePhoneNumber(formValue);
      
      if (!validationResult.isValid) {
        this.isLoading = false;
        alert(`❌ ${validationResult.message}`);
        return;
      }

      console.log(`🔍 Type d'opération: ${validationResult.type}`);
      
      // TRAITEMENT SELON LE TYPE
      switch (validationResult.type) {
        case 'new_registration':
          this.handleNewRegistration(formValue);
          break;
          
        case 'reconnection':
          this.handleReconnection(validationResult, formValue);
          break;
          
        case 'phone_change':
          this.handlePhoneChange(validationResult, formValue);
          break;
          
        default:
          this.handleError('Type d\'opération non supporté');
      }
    }
  }

  private handleNewRegistration(phoneData: any): void {
    console.log('✅ Nouvelle inscription');
    
    this.authService.handleNewRegistration(phoneData);

    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/auth/otp']);
    }, 1500);
  }

  private handleReconnection(validationResult: PhoneValidationResult, phoneData: any): void {
    console.log('🔄 Reconnexion');
    
    this.authService.handleReconnection(validationResult, phoneData);

    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/auth/nationality']);
    }, 1500);
  }

  private handlePhoneChange(validationResult: PhoneValidationResult, phoneData: any): void {
    console.log('📞 Changement de numéro');
    
    this.authService.handlePhoneChange(validationResult, phoneData);
    this.isLoading = false;
    // Redirection gérée dans le service
  }

  private handleError(message: string): void {
    this.isLoading = false;
    alert(`❌ ${message}`);
    console.error(message);
  }

  // Validation des caractères numériques
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
}