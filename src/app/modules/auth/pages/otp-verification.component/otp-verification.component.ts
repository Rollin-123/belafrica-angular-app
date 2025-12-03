// otp-verification.component.ts - VERSION CORRIGÉE
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-otp-verification',
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.scss'],
  standalone: false,
})
export class OtpVerificationComponent implements OnInit, OnDestroy {
  @ViewChild('otpInput') otpInput!: ElementRef;
  
  otpForm: FormGroup;
  isLoading: boolean = false;
  phoneNumber: string = '';
  fullPhoneNumber: string = '';
  canResend: boolean = true;
  countdown: number = 0;
  errorMessage: string = '';
  receivedCode: string = ''; // Pour le test
  
  private countdownInterval: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cd: ChangeDetectorRef
  ) {
    this.otpForm = this.fb.group({
      otpCode: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{6}$/),
        Validators.minLength(6),
        Validators.maxLength(6)
      ]]
    });
  }

  ngOnInit() {
    const tempData = localStorage.getItem('tempPhone');
    if (tempData) {
      try {
        const phoneData = JSON.parse(tempData);
        const rawNumber = phoneData.phoneNumber.replace(/\s/g, '');
        const formattedNumber = rawNumber.replace(/(\d{2})(?=\d)/g, '$1 ');
        this.phoneNumber = `${phoneData.countryCode} ${formattedNumber}`;
        this.fullPhoneNumber = phoneData.fullPhoneNumber;
        this.receivedCode = phoneData.receivedCode || '';
        
        console.log('📱 Numéro chargé pour OTP:', this.fullPhoneNumber);
        console.log('🔑 Code reçu:', this.receivedCode);
        
        // Auto-remplir pour les tests
        if (this.receivedCode && this.receivedCode.length === 6) {
          setTimeout(() => {
            this.otpForm.patchValue({ otpCode: this.receivedCode });
            this.cd.detectChanges();
          }, 500);
        }
      } catch (error) {
        console.error('❌ Erreur parsing tempPhone:', error);
        this.router.navigate(['/auth/phone']);
      }
    } else {
      console.warn('⚠️ Pas de données téléphone, redirection...');
      this.router.navigate(['/auth/phone']);
      return;
    }
    
    // Démarrer le compte à rebours
    this.startCountdown();
    
    // Focus sur le champ
    setTimeout(() => {
      if (this.otpInput?.nativeElement) {
        this.otpInput.nativeElement.focus();
      }
    }, 300);
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  // ✅ VÉRIFICATION OTP CORRIGÉE
  onVerifyOtp() {
    if (this.otpForm.valid && this.fullPhoneNumber) {
      this.isLoading = true;
      this.errorMessage = '';
      const otpCode = this.otpForm.get('otpCode')?.value;

      console.log('🔐 Vérification OTP:', otpCode);

      // VALIDATION CLIENT-SIDE POUR LES TESTS
      if (this.receivedCode && otpCode !== this.receivedCode) {
        this.isLoading = false;
        this.errorMessage = '❌ Code OTP incorrect';
        this.showErrorMessage(this.errorMessage);
        this.otpForm.patchValue({ otpCode: '' });
        this.otpInput?.nativeElement?.focus();
        return;
      }

      // APPEL BACKEND
      this.authService.verifyOTP(this.fullPhoneNumber, otpCode)
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            console.log('✅ Réponse OTP:', response);
            
            if (response.success && response.verified) {
              // Stocker la vérification
              localStorage.setItem('verified_phone', this.fullPhoneNumber);
              
              this.showSuccessMessage('✅ Code OTP validé ! Redirection...');
              
              // Redirection vers la nationalité
              setTimeout(() => {
                this.router.navigate(['/auth/nationality']);
              }, 1500);
              
            } else {
              this.errorMessage = response.error || 'Code OTP incorrect';
              this.showErrorMessage(this.errorMessage);
              this.otpForm.patchValue({ otpCode: '' });
              this.otpInput?.nativeElement?.focus();
            }
          },
          error: (error) => {
            this.isLoading = false;
            console.error('❌ Erreur vérification:', error);
            this.errorMessage = error.message || 'Erreur de connexion';
            this.showErrorMessage(this.errorMessage);
            this.otpForm.patchValue({ otpCode: '' });
            this.otpInput?.nativeElement?.focus();
          }
        });
    }
  }

  resendOtp() {
    if (this.canResend && this.fullPhoneNumber) {
      this.isLoading = true;
      this.errorMessage = '';
      
      const tempData = localStorage.getItem('tempPhone');
      if (tempData) {
        const phoneData = JSON.parse(tempData);
        
        this.authService.requestOTP(phoneData.phoneNumber, phoneData.countryCode)
          .subscribe({
            next: (response) => {
              this.isLoading = false;
              console.log('✅ OTP renvoyé:', response);
              
              if (response.success) {
                this.receivedCode = response.code || '';
                
                // Mettre à jour le code dans localStorage
                const updatedPhoneData = {
                  ...phoneData,
                  receivedCode: response.code
                };
                localStorage.setItem('tempPhone', JSON.stringify(updatedPhoneData));
                
                this.showSuccessMessage('📱 Nouveau code envoyé !');
                this.startCountdown();
                
                // Auto-remplir
                if (response.code?.length === 6) {
                  this.otpForm.patchValue({ otpCode: response.code });
                }
              } else {
                this.errorMessage = response.error || 'Erreur envoi';
                this.showErrorMessage(this.errorMessage);
              }
            },
            error: (error) => {
              this.isLoading = false;
              this.errorMessage = error.message || 'Erreur connexion';
              this.showErrorMessage(this.errorMessage);
            }
          });
      }
    }
  }

  // ✅ COMPTE À REBOURS
  startCountdown() {
    this.canResend = false;
    this.countdown = 60;
    
    this.stopCountdown();
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      
      if (this.countdown <= 0) {
        this.stopCountdown();
        this.canResend = true;
        this.countdown = 0;
      }
      
      this.cd.detectChanges();
    }, 1000);
  }

  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  getFormattedCountdown(): string {
    const minutes = Math.floor(this.countdown / 60);
    const seconds = this.countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  goBack() {
    this.stopCountdown();
    this.router.navigate(['/auth/phone']);
  }

  // ✅ VALIDATION DES CARACTÈRES
  validateOtpInput(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    
    // Chiffres 0-9, Backspace, Delete, Flèches
    if ((charCode >= 48 && charCode <= 57) || 
        charCode === 8 || 
        charCode === 46 || 
        charCode === 37 || 
        charCode === 39) {
      return true;
    }
    
    event.preventDefault();
    return false;
  }

  // ✅ MESSAGES D'ALERTE
  private showSuccessMessage(message: string): void {
    this.createNotification('✅ Succès', message, '#38A169');
  }

  private showErrorMessage(message: string): void {
    this.createNotification('❌ Erreur', message, '#E53E3E');
  }

  private createNotification(title: string, message: string, color: string): void {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.bel-notification');
    existingNotifications.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = 'bel-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-left: 4px solid ${color};
      border-radius: 8px;
      padding: 15px 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <div style="font-size: 20px;">${title.includes('✅') ? '✅' : '❌'}</div>
        <div style="flex: 1;">
          <strong style="color: ${color}; display: block; margin-bottom: 5px;">
            ${title}
          </strong>
          <div style="color: #4A5568; font-size: 14px;">
            ${message}
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; font-size: 18px; cursor: pointer; color: #A0AEC0;">
          ×
        </button>
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }
}