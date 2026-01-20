/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
// src/app/modules/auth/pages/phone-verification.component.ts - CORRIGÉ
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-phone-verification',
  templateUrl: './phone-verification.component.html',
  standalone: false,
  styleUrls: ['./phone-verification.component.scss']
})
export class PhoneVerificationComponent implements OnInit {
  phoneForm: FormGroup;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
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
    private authService: AuthService
  ) {
    this.phoneForm = this.fb.group({
      countryCode: [this.europeanCountries[2].code, Validators.required], // Biélorussie par défaut
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s]{8,15}$/)]]
    });
  }

  ngOnInit(): void {
    // ✅ GESTION DU RETOUR DEPUIS TELEGRAM SUR ANDROID
    // Si l'application est rechargée et que l'utilisateur était en plein milieu
    // du flux OTP, on le redirige vers la page de saisie du code, mais seulement si la session est récente.
    const tempPhoneInfoString = localStorage.getItem('belafrica_temp_phone');
    const telegramResponse = localStorage.getItem('telegram_otp_response');

    // ✅ CORRECTION : On ne redirige que si l'utilisateur n'est PAS déjà authentifié.
    // Cela évite la boucle après une connexion réussie.
    if (tempPhoneInfoString && telegramResponse && !this.authService.isAuthenticated()) {
      try {
        const tempPhoneInfo = JSON.parse(tempPhoneInfoString);
        const otpRequestTime = tempPhoneInfo.timestamp;
        const tenMinutes = 10 * 60 * 1000;  

        // On redirige seulement si la demande de code a moins de 10 minutes
        if (otpRequestTime && (Date.now() - otpRequestTime < tenMinutes)) {
          console.log('📱 Détection d\'un retour récent depuis Telegram. Redirection vers la page OTP.');
          this.router.navigate(['/auth/otp']);
        } else {
          // La session est expirée, on nettoie le stockage pour éviter une redirection incorrecte
          console.log('📱 Détection d\'une session OTP expirée. Nettoyage du localStorage.');
          localStorage.removeItem('belafrica_temp_phone');
          localStorage.removeItem('telegram_otp_response');
        }
      } catch (e) {
        localStorage.removeItem('belafrica_temp_phone');
        localStorage.removeItem('telegram_otp_response');
      }
    }
  }

  onKeyPress(event: KeyboardEvent): boolean {
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

  formatPhone(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length > 2) {
      value = value.substring(0, 2) + ' ' + value.substring(2);
    }
    if (value.length > 5) {
      value = value.substring(0, 5) + ' ' + value.substring(5);
    }
    if (value.length > 8) {
      value = value.substring(0, 8) + ' ' + value.substring(8);
    }
    
    event.target.value = value.substring(0, 11);
    this.phoneForm.get('phoneNumber')?.setValue(value, { emitEvent: false });
  }

  onSubmit() {
    if (this.phoneForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      const formValue = this.phoneForm.value;
      const phoneNumber = formValue.phoneNumber.replace(/\s/g, '');
      const fullPhoneNumber = `${formValue.countryCode}${phoneNumber}`;
      
      console.log('📱 Demande OTP pour:', fullPhoneNumber);

      // Nettoyer les données précédentes
      localStorage.removeItem('belafrica_temp_phone'); // Assurez-vous que la clé est cohérente
      localStorage.removeItem('verified_phone');
      localStorage.removeItem('userRegistrationData');
      localStorage.removeItem('geo_validation');
      localStorage.removeItem('telegram_otp_response'); // ✅ Nettoyer la réponse précédente

      this.authService.requestOtp(phoneNumber, formValue.countryCode)
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            console.log('✅ Réponse OTP:', response);

            if (response.success) {
              // Sauvegarder la réponse complète pour la page de redirection
              if (response.links || response.requiresBotStart) {
                localStorage.setItem('telegram_otp_response', JSON.stringify(response));
              }
              
              // Sauvegarder les informations du téléphone pour les étapes suivantes
              const countryName = this.europeanCountries.find(c => c.code === formValue.countryCode)?.name || '';
              const phoneData = { 
                fullPhoneNumber: fullPhoneNumber,
                countryCode: formValue.countryCode,
                countryName: countryName,
                timestamp: Date.now() // On ajoute un timestamp
              };
              localStorage.setItem('belafrica_temp_phone', JSON.stringify(phoneData));
              
              // ✅ LOGIQUE DE REDIRECTION RESTAURÉE
              // Si le backend demande le deep linking, on redirige vers la page d'attente.
              if (response.requiresBotStart && response.links) {
                this.router.navigate(['/auth/telegram-redirect']);
              } else {
                // Fallback (ne devrait plus être utilisé mais reste par sécurité)
                this.successMessage = response.message || 'Code envoyé !';
                setTimeout(() => {
                  this.router.navigate(['/auth/otp']);
                }, 1500);
              }
            } else {
              this.errorMessage = response.error || 'Erreur lors de l\'envoi du code';
              this.showError(this.errorMessage);
            }
          },
          error: (error) => {
            this.isLoading = false;
            console.error('❌ Erreur OTP:', error);
            // ✅ Logique améliorée pour extraire le message d'erreur de l'API
            let apiErrorMessage = 'Erreur de connexion au serveur. Veuillez réessayer.';
            if (error.error && typeof error.error.error === 'string') {
              // Le message d'erreur est directement dans error.error.error
              apiErrorMessage = error.error.error;
            } else if (error.message) {
              apiErrorMessage = error.message;
            }
            this.errorMessage = apiErrorMessage;
            this.showError(this.errorMessage);
          }
        });
    }
  }

  // ✅ AFFICHER LES ERREURS DANS UNE MODAL
  private showError(message: string): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = `
      <div style="color: #E53E3E; margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 10px;">🚫</div>
        <h2 style="margin-bottom: 10px;">Accès Refusé</h2>
      </div>
      
      <div style="
        background: #FED7D7;
        border-left: 4px solid #E53E3E;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: left;
      ">
        <p style="color: #742A2A; margin: 0; white-space: pre-line;">
          ${message}
        </p>
      </div>
      
      <button id="closeBtn" style="
        background: #E53E3E;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 30px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
      ">
        Compris
      </button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Fermer la modal
    document.getElementById('closeBtn')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
}