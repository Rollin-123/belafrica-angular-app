import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-otp-verification',
  standalone: false,
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.scss']
})
export class OtpVerificationComponent implements OnInit {
  otpForm: FormGroup;
  isLoading = false;
  phoneNumber: string = '';
  errorMessage: string = '';
  countdown: number = 60;
  canResend = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.otpForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit() {
    // Récupérer le numéro depuis localStorage
    const tempData = localStorage.getItem('belafrica_temp_phone');
    if (tempData) {
      try {
        const data = JSON.parse(tempData);
        this.phoneNumber = data.fullPhoneNumber; // ✅ Utiliser la bonne propriété
        console.log('📱 Page de vérification pour:', this.phoneNumber);
      } catch (error) {
        this.router.navigate(['/auth/phone']);
      }
    } else {
      this.router.navigate(['/auth/phone']);
    }

    // Démarrer le compte à rebours
    this.startCountdown();
  }

  startCountdown() {
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.canResend = true;
      }
    }, 1000);
  }

  onSubmit() {
    if (this.otpForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const otp = this.otpForm.get('otpCode')?.value;
      
      console.log('🔐 Vérification OTP:', otp, 'pour', this.phoneNumber);

      this.authService.verifyOtp(this.phoneNumber, otp).subscribe({
        next: (response) => {
          console.log('✅ OTP validé:', response);

          if (response.success && response.tempToken) {
            // ✅ CORRECTION DÉFINITIVE: Sauvegarder le token temporaire.
            // L'intercepteur HTTP l'utilisera pour la prochaine requête.
            // Assurez-vous que la clé 'belafrica_token' est celle que votre intercepteur recherche.
            localStorage.setItem('belafrica_token', response.tempToken);
            
            // Rediriger vers la sélection de nationalité
            this.router.navigate(['/auth/nationality']);
          } else {
            this.errorMessage = response.error || 'Réponse invalide du serveur après vérification OTP.';
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('❌ Erreur vérification OTP:', error);
          this.errorMessage = error.error?.error || 'Code OTP incorrect';
          this.isLoading = false;
        }
      });
    }
  }

  resendOtp() {
    if (this.canResend) {
      // Réinitialiser
      this.countdown = 60;
      this.canResend = false;
      this.startCountdown();
      
      // Simuler renvoi
      console.log('🔄 Renvoi OTP demandé pour', this.phoneNumber);
      // Ici vous pourriez rappeler requestOtp
    }
  }

  validateOtpInput(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Autorise uniquement les chiffres (48-57)
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  goBack() {
    this.router.navigate(['/auth/phone']);
  }
}