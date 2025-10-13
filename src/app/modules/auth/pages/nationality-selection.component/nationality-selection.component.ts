import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, PhoneValidationResult } from '../../../../core/services/auth.service';

interface AfricanCountry {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-nationality-selection',
  standalone: false,
  templateUrl: './nationality-selection.component.html',
  styleUrls: ['./nationality-selection.component.scss']
})
export class NationalitySelectionComponent implements OnInit {
  nationalityForm: FormGroup;
  isLoading: boolean = false;
  detectedCountry: string = '';
  selectedCountryName: string = '';
  selectedCountryFlag: string = '';
  
  // Flags pour la gestion des différents scénarios
  isReconnection: boolean = false;
  isPhoneChange: boolean = false;
  previousNationality: string = '';
  previousNationalityName: string = '';
  validationResult: PhoneValidationResult | null = null;

  // Liste des pays africains
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
    private router: Router
  ) {
    this.nationalityForm = this.fb.group({
      nationality: ['', Validators.required]
    });
  }

 ngOnInit() {
    // Récupérer le pays de résidence
    const tempData = localStorage.getItem('tempPhone');
    if (tempData) {
      const phoneData = JSON.parse(tempData);
      this.detectedCountry = this.getCountryNameFromCode(phoneData.countryCode);
    } else {
      this.router.navigate(['/auth/phone']);
    }

    // Écouter les changements de nationalité
    this.nationalityForm.get('nationality')?.valueChanges.subscribe(value => {
      this.updateSelectedCountryInfo(value);
    });
  }

  // Mettre à jour les informations du pays sélectionné
  updateSelectedCountryInfo(countryCode: string) {
    if (countryCode) {
      const country = this.africanCountries.find(c => c.code === countryCode);
      this.selectedCountryName = country?.name || '';
      this.selectedCountryFlag = country?.flag || '';
    } else {
      this.selectedCountryName = '';
      this.selectedCountryFlag = '';
    }
  }

  onNationalityChange() {
    console.log('Nationalité sélectionnée:', this.nationalityForm.get('nationality')?.value);
  }

  // Sélectionner un pays
  selectCountry(country: AfricanCountry) {
    this.nationalityForm.patchValue({
      nationality: country.code
    });
  }

  // 🆕 SOUMISSION INTELLIGENTE AVEC NOUVELLES MÉTHODES
  onSubmit() {
    if (this.nationalityForm.valid) {
      this.isLoading = true;

      const tempData = localStorage.getItem('tempPhone');
      if (tempData) {
        const phoneData = JSON.parse(tempData);
        const selectedNationality = this.nationalityForm.get('nationality')?.value;
        
        // TROUVER LE PAYS SÉLECTIONNÉ
        const selectedCountry = this.africanCountries.find(
          c => c.code === selectedNationality
        );
        
        if (!selectedCountry) {
          alert('❌ Pays non trouvé');
          this.isLoading = false;
          return;
        }

        // 🎯 LOGIQUE INTELLIGENTE SELON LE TYPE DE CONNEXION
        if (this.isReconnection) {
          this.handleReconnection(phoneData, selectedNationality, selectedCountry);
        } else if (this.isPhoneChange) {
          // ⚠️ NE DEVRAIT PAS ARRIVER ICI - Le changement de numéro est traité directement
          this.handlePhoneChangeError();
        } else {
          this.handleNewRegistration(phoneData, selectedNationality, selectedCountry);
        }
      } else {
        this.isLoading = false;
        alert('❌ Données téléphone non trouvées');
        this.router.navigate(['/auth/phone']);
      }
    }
  }

  // 🔄 RECONNEXION - UTILISE LA NOUVELLE MÉTHODE
  private handleReconnection(phoneData: any, selectedNationality: string, selectedCountry: any): void {
    console.log('🔄 Traitement reconnexion');
    
    // ⚠️ SÉCURITÉ : Vérifier la cohérence de la nationalité
    if (this.previousNationality && this.previousNationality !== selectedNationality) {
      const message = `⚠️ Votre nationalité ne peut pas être modifiée. \n\n` +
                     `Votre nationalité d'origine est : ${this.previousNationalityName}\n` +
                     `Voulez-vous continuer avec votre nationalité d'origine ?`;
      
      if (confirm(message)) {
        // Forcer la nationalité originale
        this.nationalityForm.patchValue({ nationality: this.previousNationality });
        selectedNationality = this.previousNationality;
      } else {
        this.isLoading = false;
        return;
      }
    }

    // 🆕 UTILISATION DE LA NOUVELLE MÉTHODE
    this.cleanupTempData();
    this.isLoading = false;
  }

  // 📞 CHANGEMENT DE NUMÉRO - NE DEVRAIT PAS ARRIVER ICI
  private handlePhoneChangeError(): void {
    console.error('❌ ERREUR: Changement de numéro ne devrait pas passer par la sélection de nationalité');
    alert('Erreur système. Redirection...');
    this.cleanupTempData();
    this.router.navigate(['/auth/phone']);
  }

  // ✅ NOUVELLE INSCRIPTION
  private handleNewRegistration(phoneData: any, selectedNationality: string, selectedCountry: any): void {
    console.log('✅ Traitement nouvelle inscription');
    
    const userData = {
      phoneNumber: `${phoneData.countryCode}${phoneData.phoneNumber.replace(/\s/g, '')}`,
      fullPhoneNumber: phoneData.fullPhoneNumber || `${phoneData.countryCode}${phoneData.phoneNumber.replace(/\s/g, '')}`,
      countryCode: phoneData.countryCode,
      countryName: this.detectedCountry,
      nationality: selectedNationality,
      nationalityName: selectedCountry.name
    };

    console.log('🌍 Données utilisateur COMPLÈTES:', userData);
    
    // Stocker pour l'étape profil
    localStorage.setItem('userRegistrationData', JSON.stringify(userData));

    setTimeout(() => {
      this.isLoading = false;
      this.cleanupTempData();
      this.router.navigate(['/auth/profile']);
    }, 1000);
  }

  // 🧹 NETTOYAGE DES DONNÉES TEMPORAIRES
  private cleanupTempData(): void {
    localStorage.removeItem('tempPhone');
    localStorage.removeItem('isReconnection');
    localStorage.removeItem('isPhoneChange');
  }

  goBack() {
    this.router.navigate(['/auth/phone']);
  }

  // Helper pour obtenir le nom du pays depuis le code
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
}