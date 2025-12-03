// src/app/modules/auth/pages/nationality-selection.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

interface AfricanCountry {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-nationality-selection',
  templateUrl: './nationality-selection.component.html',
  standalone: false,
  styleUrls: ['./nationality-selection.component.scss']
})
export class NationalitySelectionComponent implements OnInit {
  nationalityForm: FormGroup;
  isLoading: boolean = false;
  detectedCountry: string = '';
  selectedCountryName: string = '';
  selectedCountryFlag: string = '';
  errorMessage: string = '';
  communityPreview: string = '';

  // ✅ LISTE COMPLÈTE DES PAYS AFRICAINS AVEC DRAPEAUX
  africanCountries: AfricanCountry[] = [
    { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
    { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
    { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
    { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
    { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻' },
    { code: 'CF', name: 'République centrafricaine', flag: '🇨🇫' },
    { code: 'TD', name: 'Tchad', flag: '🇹🇩' },
    { code: 'KM', name: 'Comores', flag: '🇰🇲' },
    { code: 'CG', name: 'République du Congo', flag: '🇨🇬' },
    { code: 'CD', name: 'République démocratique du Congo', flag: '🇨🇩' },
    { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
    { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
    { code: 'EG', name: 'Égypte', flag: '🇪🇬' },
    { code: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶' },
    { code: 'ER', name: 'Érythrée', flag: '🇪🇷' },
    { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
    { code: 'ET', name: 'Éthiopie', flag: '🇪🇹' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
    { code: 'GM', name: 'Gambie', flag: '🇬🇲' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'GN', name: 'Guinée', flag: '🇬🇳' },
    { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
    { code: 'LR', name: 'Libéria', flag: '🇱🇷' },
    { code: 'LY', name: 'Libye', flag: '🇱🇾' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱' },
    { code: 'MR', name: 'Mauritanie', flag: '🇲🇷' },
    { code: 'MU', name: 'Maurice', flag: '🇲🇺' },
    { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
    { code: 'NA', name: 'Namibie', flag: '🇳🇦' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪' },
    { code: 'NG', name: 'Nigéria', flag: '🇳🇬' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
    { code: 'ST', name: 'Sao Tomé-et-Principe', flag: '🇸🇹' },
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
    { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
    { code: 'SO', name: 'Somalie', flag: '🇸🇴' },
    { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦' },
    { code: 'SS', name: 'Soudan du Sud', flag: '🇸🇸' },
    { code: 'SD', name: 'Soudan', flag: '🇸🇩' },
    { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬' },
    { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
    { code: 'UG', name: 'Ouganda', flag: '🇺🇬' },
    { code: 'ZM', name: 'Zambie', flag: '🇿🇲' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.nationalityForm = this.fb.group({
      nationality: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Vérifier que l'utilisateur vient bien de l'étape OTP
    const tempData = localStorage.getItem('tempPhone');
    const verifiedPhone = localStorage.getItem('verified_phone');
    
    if (!tempData && !verifiedPhone) {
      console.error('❌ Aucune donnée de vérification trouvée');
      this.showErrorModal(
        'Données manquantes', 
        'Veuillez d\'abord vérifier votre numéro de téléphone.'
      );
      setTimeout(() => this.router.navigate(['/auth/phone']), 2000);
      return;
    }

    if (tempData) {
      try {
        const phoneData = JSON.parse(tempData);
        this.detectedCountry = this.getCountryNameFromCode(phoneData.countryCode);
        console.log('🌍 Pays détecté:', this.detectedCountry);
      } catch (error) {
        console.error('❌ Erreur parsing tempPhone:', error);
        this.router.navigate(['/auth/phone']);
      }
    }

    // S'abonner aux changements de sélection
    this.nationalityForm.get('nationality')?.valueChanges.subscribe(value => {
      this.updateSelectedCountryInfo(value);
      this.updateCommunityPreview();
    });
  }

  updateSelectedCountryInfo(countryCode: string) {
    if (countryCode) {
      const country = this.africanCountries.find(c => c.code === countryCode);
      if (country) {
        this.selectedCountryName = country.name;
        this.selectedCountryFlag = country.flag;
        console.log('✅ Pays sélectionné:', country.name);
      } else {
        this.selectedCountryName = '';
        this.selectedCountryFlag = '';
      }
    } else {
      this.selectedCountryName = '';
      this.selectedCountryFlag = '';
    }
  }

  updateCommunityPreview() {
    const selectedCode = this.nationalityForm.get('nationality')?.value;
    if (selectedCode && this.detectedCountry) {
      const country = this.africanCountries.find(c => c.code === selectedCode);
      if (country) {
        // Format: "TunisieEnFrance"
        this.communityPreview = `${country.name}En${this.detectedCountry.replace(/\s/g, '')}`;
        console.log('🏠 Prévisualisation communauté:', this.communityPreview);
      }
    } else {
      this.communityPreview = '';
    }
  }

  onSubmit() {
    if (this.nationalityForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const tempData = localStorage.getItem('tempPhone');
      const verifiedPhone = localStorage.getItem('verified_phone');
      
      if (!tempData && !verifiedPhone) {
        this.errorMessage = 'Veuillez d\'abord vérifier votre numéro de téléphone';
        this.isLoading = false;
        this.showErrorModal('Données manquantes', this.errorMessage);
        return;
      }

      try {
        let phoneData;
        if (tempData) {
          phoneData = JSON.parse(tempData);
        } else if (verifiedPhone) {
          // Récupérer les infos depuis le backend si nécessaire
          phoneData = {
            fullPhoneNumber: verifiedPhone,
            countryCode: '+375', // Valeur par défaut, à ajuster
            detectedCountry: this.detectedCountry || 'Biélorussie'
          };
        }

        const selectedCountry = this.africanCountries.find(
          c => c.code === this.nationalityForm.get('nationality')?.value
        );

        if (!selectedCountry) {
          this.errorMessage = 'Veuillez sélectionner un pays valide';
          this.isLoading = false;
          this.showErrorModal('Sélection invalide', this.errorMessage);
          return;
        }

        // Créer la communauté selon le format attendu
        const community = `${selectedCountry.name}En${this.detectedCountry.replace(/\s/g, '')}`;
        
        const profileData = {
          phoneNumber: phoneData.fullPhoneNumber,
          countryCode: phoneData.countryCode,
          countryName: this.detectedCountry,
          nationality: selectedCountry.code,
          nationalityName: selectedCountry.name,
          community: community
        };

        console.log('📋 Données pour création profil:', profileData);
        
        // Sauvegarder pour l'étape suivante
        localStorage.setItem('userRegistrationData', JSON.stringify(profileData));

        // Afficher confirmation
        this.showSuccessModal(
          'Nationalité sélectionnée',
          `Vous rejoindrez la communauté :<br><strong>${selectedCountry.name} en ${this.detectedCountry}</strong>`
        );

        // Rediriger vers le profil
        setTimeout(() => {
          this.isLoading = false;
          this.router.navigate(['/auth/profile']);
        }, 2000);

      } catch (error: any) {
        console.error('❌ Erreur:', error);
        this.errorMessage = error.message || 'Erreur lors du traitement';
        this.isLoading = false;
        this.showErrorModal('Erreur', this.errorMessage);
      }
    } else {
      this.errorMessage = 'Veuillez sélectionner votre nationalité';
      this.showErrorModal('Champ requis', this.errorMessage);
    }
  }

  goBack() {
    this.router.navigate(['/auth/otp']);
  }

  private getCountryNameFromCode(code: string): string {
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
    return countries[code] || 'Pays inconnu';
  }

  // ✅ MODAL D'ERREUR PROFESSIONNELLE
  private showErrorModal(title: string, message: string): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 30px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 48px; color: #E53E3E; margin-bottom: 10px;">⚠️</div>
        <h2 style="margin: 0 0 10px 0; color: #2D3748; font-size: 22px;">
          ${title}
        </h2>
      </div>
      
      <div style="
        background: #FED7D7;
        border-left: 4px solid #E53E3E;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: left;
      ">
        <p style="color: #742A2A; margin: 0; font-size: 15px; line-height: 1.4;">
          ${message}
        </p>
      </div>
      
      <button class="modal-close-btn" style="
        background: #E53E3E;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 30px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: background 0.3s;
      " onmouseover="this.style.background='#C53030'" onmouseout="this.style.background='#E53E3E'">
        Compris
      </button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Fermer la modal
    const closeBtn = modalContent.querySelector('.modal-close-btn');
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // ✅ MODAL DE SUCCÈS PROFESSIONNELLE
  private showSuccessModal(title: string, message: string): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 30px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 48px; color: #38A169; margin-bottom: 10px;">✅</div>
        <h2 style="margin: 0 0 10px 0; color: #2D3748; font-size: 22px;">
          ${title}
        </h2>
      </div>
      
      <div style="
        background: #C6F6D5;
        border-left: 4px solid #38A169;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: left;
      ">
        <p style="color: #276749; margin: 0; font-size: 15px; line-height: 1.4;">
          ${message}
        </p>
      </div>
      
      <button class="modal-close-btn" style="
        background: #38A169;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 30px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: background 0.3s;
      " onmouseover="this.style.background='#2F855A'" onmouseout="this.style.background='#38A169'">
        Continuer
      </button>
      
      <style>
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Fermer la modal automatiquement après 3s
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 3000);
    
    // Fermer manuellement
    const closeBtn = modalContent.querySelector('.modal-close-btn');
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
}