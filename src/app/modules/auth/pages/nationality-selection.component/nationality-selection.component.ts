import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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

  // Liste complète des pays africains
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
    // Récupérer le pays de résidence depuis les données temporaires
    const tempData = localStorage.getItem('tempPhone');
    if (tempData) {
      const phoneData = JSON.parse(tempData);
      this.detectedCountry = this.getCountryNameFromCode(phoneData.countryCode);
    } else {
      // Si pas de données, retour à l'écran téléphone
      this.router.navigate(['/auth/phone']);
    }

    this.nationalityForm.get('nationality')?.valueChanges.subscribe(value => {
      this.updateSelectedCountryInfo(value);
    
    })
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
    // Cette méthode est appelée quand la sélection change
    console.log('Nationalité sélectionnée:', this.nationalityForm.get('nationality')?.value);
  }

  // Sélectionner un pays
  selectCountry(country: AfricanCountry) {
    this.nationalityForm.patchValue({
      nationality: country.code
    });
  }

  // Soumission du formulaire
  onSubmit() {
  if (this.nationalityForm.valid) {
    this.isLoading = true;

    // Récupérer les données existantes
    const tempData = localStorage.getItem('tempPhone');
    if (tempData) {
      const phoneData = JSON.parse(tempData);
      
      // TROUVER LE PAYS SÉLECTIONNÉ
      const selectedCountry = this.africanCountries.find(
        c => c.code === this.nationalityForm.get('nationality')?.value
      );
      
      if (!selectedCountry) {
        alert('❌ Pays non trouvé');
        this.isLoading = false;
        return;
      }

      // ⚠️ CORRECTION : Créer l'objet COMPLET avec toutes les propriétés
      const userData = {
        phoneNumber: `${phoneData.countryCode}${phoneData.phoneNumber.replace(/\s/g, '')}`,
        countryCode: phoneData.countryCode,
        countryName: this.detectedCountry, // ⬅️ IMPORTANT
        nationality: this.nationalityForm.get('nationality')?.value,
        nationalityName: selectedCountry.name // ⬅️ IMPORTANT
      };

      console.log('🌍 Données utilisateur COMPLÈTES:', userData);

      // Stocker les données complètes
      localStorage.setItem('userRegistrationData', JSON.stringify(userData));

      // Simulation traitement
      setTimeout(() => {
        this.isLoading = false;
        this.router.navigate(['/auth/profile']);
      }, 1000);
    } else {
      this.isLoading = false;
      alert('❌ Données téléphone non trouvées');
      this.router.navigate(['/auth/phone']);
    }
  }
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