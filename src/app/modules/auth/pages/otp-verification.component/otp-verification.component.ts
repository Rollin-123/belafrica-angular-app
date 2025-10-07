import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-otp-verification',
  standalone: false,
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.scss']
})
export class OtpVerificationComponent implements OnInit, OnDestroy {
    @ViewChild('otpInput') otpInput!: ElementRef;
  otpForm: FormGroup;
  isLoading: boolean = false;
  phoneNumber: string = '';
  canResend: boolean = true;
  countdown: number = 0;
  
  private countdownInterval: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
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
      const phoneData = JSON.parse(tempData);
      const rawNumber = phoneData.phoneNumber.replace(/\s/g, '');
      const formattedNumber = rawNumber.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
      this.phoneNumber = `${phoneData.countryCode} ${formattedNumber}`;
    } else {
      this.router.navigate(['/auth/phone']);
    }
    setTimeout(() => {
      if (this.otpInput) {
        this.otpInput.nativeElement.focus();
      }
    }, 300);
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  validateOtpInput(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    
    // Autoriser seulement les chiffres (0-9)
    if (charCode >= 48 && charCode <= 57) {
      return true;
    }
    
    // Bloquer tout autre caractère (même backspace pour OTP)
    event.preventDefault();
    return false;
  }

  onVerifyOtp() {
    if (this.otpForm.valid) {
      this.isLoading = true;
      const otpCode = this.otpForm.get('otpCode')?.value;

      console.log('🔐 Vérification OTP:', otpCode);

      setTimeout(() => {
        this.isLoading = false;
        
        if (otpCode === '123456') {
          console.log('✅ OTP validé avec succès');
          this.router.navigate(['/auth/nationality']);
        } else {
          alert('❌ Code OTP incorrect. Utilisez 123456 pour le test.');
        }
      }, 1500);
    }
  }

  resendOtp() {
    if (this.canResend) {
      console.log('📱 Renvoi du code OTP');
      this.startCountdown();
      alert('Nouveau code envoyé ! (Utilisez 123456)');
    }
  }

  startCountdown() {
    this.canResend = false;
    this.countdown = 60;
    
    // Arrêter tout intervalle existant
    this.stopCountdown();
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      
      // ⬅️ FORCER LA MISE À JOUR DE LA VUE
      this.cd.detectChanges();
      
      
      if (this.countdown <= 0) {
        this.stopCountdown();
        this.canResend = true;
        this.countdown = 0;
        this.cd.detectChanges();
      }
    }, 1000);
  }

  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  goBack() {
    this.stopCountdown(); // Arrêter le compteur avant de partir
    this.router.navigate(['/auth/phone']);
  }
}