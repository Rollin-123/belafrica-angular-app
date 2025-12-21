// src/app/modules/auth/pages/nationality-selection.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, Form } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ModalService } from '../../../../core/services/modal.service';

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
    private authService: AuthService,
    @Inject(ModalService) private modalService: ModalService // ✅ INJECTER LE SERVICE
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
      this.modalService.showError( // ✅ UTILISER LE SERVICE
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
        this.modalService.showError('Données manquantes', this.errorMessage); // ✅ UTILISER LE SERVICE
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
          this.modalService.showError('Sélection invalide', this.errorMessage); // ✅ UTILISER LE SERVICE
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
        this.modalService.showSuccess( // ✅ UTILISER LE SERVICE
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
        this.modalService.showError('Erreur', this.errorMessage); // ✅ UTILISER LE SERVICE
      }
    } else {
      this.errorMessage = 'Veuillez sélectionner votre nationalité';
      this.modalService.showError('Champ requis', this.errorMessage); // ✅ UTILISER LE SERVICE
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

  // ❌ SUPPRIMER LES FONCTIONS showErrorModal et showSuccessModal
}