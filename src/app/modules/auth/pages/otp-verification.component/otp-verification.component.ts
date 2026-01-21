/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ModalService } from '../../../../core/services/modal.service';
import { UserService } from '../../../../core/services/user.service';

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
    private authService: AuthService,
    private userService: UserService,
    private modalService: ModalService
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
        this.phoneNumber = data.fullPhoneNumber;  
        console.log('📱 Page de vérification pour:', this.phoneNumber);
      } catch (error) {
        this.router.navigate(['/auth/phone']);
      }
    } else {
      this.router.navigate(['/auth/phone']);
    }
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
          this.isLoading = false;
          console.log('✅ OTP validé:', response);

          if (response.success) {
            // Cas 1: L'utilisateur existe déjà, le backend a mis le cookie et renvoyé l'utilisateur
            if (response.user) {
              console.log('🚀 Connexion réussie. Redirection vers l\'application...');
              localStorage.removeItem('belafrica_temp_phone');
              localStorage.removeItem('telegram_otp_response');
              this.userService.setCurrentUser(response.user);
              this.router.navigate(['/app/national']);
            }
            // Cas 2: Nouvel utilisateur, le backend renvoie un token temporaire pour finaliser le profil
            else if (response.tempToken) {
              console.log('✅ OTP validé pour un nouvel utilisateur. Redirection vers la finalisation du profil...');
              localStorage.setItem('belafrica_temp_token', response.tempToken);
              this.router.navigate(['/auth/nationality']);
            }
            // Cas d'erreur inattendu
            else {
              this.errorMessage = response.message || 'Réponse inattendue du serveur.';
              this.modalService.showError('Erreur', '❌ Réponse inattendue du serveur après vérification OTP.');
            }

          } else {
            this.errorMessage = response.message || 'Une erreur est survenue.';
          }
        },
        error: (error) => {
          console.error('❌ Erreur vérification OTP:', error);
           this.errorMessage = error.error?.message || 'Code OTP incorrect ou expiré.';
          this.modalService.showError('Erreur', this.errorMessage);
        }
      });
    }
  }

  resendOtp() {
    if (this.canResend) {
      this.countdown = 60;
      this.canResend = false;
      this.startCountdown();
    }
  }

  validateOtpInput(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
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