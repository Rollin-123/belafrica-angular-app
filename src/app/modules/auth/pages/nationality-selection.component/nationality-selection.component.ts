// src/app/modules/auth/pages/nationality-selection.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, Form } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ModalService } from '../../../../core/services/modal.service'; 
import { ConfigService } from '../../../../core/services/config.service';

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

  africanCountries: AfricanCountry[] = [];
  private countryNames: { [key: string]: string } = {};

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    @Inject(ModalService) private modalService: ModalService,
    private configService: ConfigService 
  ) {
    this.nationalityForm = this.fb.group({
      nationality: ['', Validators.required]
    });

    // ✅ Initialiser les listes depuis les constantes chargées
    const appConstants = this.configService.constants;
    this.africanCountries = appConstants.AFRICAN_COUNTRIES;
    this.countryNames = appConstants.COUNTRY_NAMES;
  }

  ngOnInit() {
    const tempData = localStorage.getItem('belafrica_temp_phone');
    const verifiedPhone = localStorage.getItem('verified_phone');
    
    if (!tempData && !verifiedPhone) {
      console.error('❌ Aucune donnée de vérification trouvée');
      this.modalService.showError( 
        'Données manquantes', 
        'Veuillez d\'abord vérifier votre numéro de téléphone.'
      );
      setTimeout(() => this.router.navigate(['/auth/phone']), 2000);
      return;
    }

    if (tempData) {
      try {
        const phoneData = JSON.parse(tempData);
        this.detectedCountry = phoneData.countryName || this.getCountryNameFromCode(phoneData.countryCode);
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

      const tempData = localStorage.getItem('belafrica_temp_phone');
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
    // ✅ UTILISER LES CONSTANTES CHARGÉES
    return this.countryNames[code as keyof typeof this.countryNames] || 'Pays inconnu';
  }

  // ❌ SUPPRIMER LES FONCTIONS showErrorModal et showSuccessModal
}