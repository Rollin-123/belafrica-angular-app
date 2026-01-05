import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';
import { ConfigService } from '../../../../core/services/config.service'; 
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-code-generator',
  standalone: false,
  templateUrl: './admin-code-generator.component.html',
  styleUrls: ['./admin-code-generator.component.scss']
})
export class AdminCodeGeneratorComponent implements OnInit, OnDestroy {
  codeForm: FormGroup;
  isLoading = false;
  generatedCode: string = '';
  generatedCodes: any[] = [];
  showCode = false;
  private adminSub: Subscription = new Subscription();

  // ✅ Listes qui seront initialisées depuis le ConfigService
  europeanCountries: any[] = [];
  africanNationalities: string[] = [];
  
permissionLevels = [
  {
    value: 'national',
    label: '🏠 Admin National',
    description: 'Peut publier uniquement dans sa communauté nationale',
    permissions: ['post_national'],
    badge: 'NATIONAL'
  },
  {
    value: 'international', 
    label: '🌍 Admin International', 
    description: 'Peut publier uniquement dans le fil international',
    permissions: ['post_international'],
    badge: 'INTERNATIONAL'
  },
  {
    value: 'both',
    label: '👑 Admin Complet',
    description: 'Peut publier dans les deux espaces (national + international)',
    permissions: ['post_national', 'post_international'],
    badge: 'COMPLET'
  }
];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private configService: ConfigService 
  ) {
    this.codeForm = this.fb.group({
      countryCode: ['', Validators.required],
      countryName: ['', Validators.required],
      nationality: ['', Validators.required],
      userEmail: ['', [Validators.required, Validators.email]],
      permissionLevel: ['national', Validators.required],
      expiresIn: [24, Validators.required]
    });

    // ✅ Initialiser les listes depuis les constantes chargées
    const appConstants = this.configService.constants;
    this.africanNationalities = appConstants.AFRICAN_COUNTRIES.map((country: any) => country.name);
    
    // ✅ Utiliser le mapping complet pour avoir le nom et le code ISO
    this.europeanCountries = Object.entries(appConstants.PHONE_COUNTRY_MAPPING).map(([phoneCode, isoCodes]: [string, any]) => ({
        name: appConstants.COUNTRY_NAMES[phoneCode as keyof typeof appConstants.COUNTRY_NAMES],
        code: isoCodes[0] // On prend le premier code ISO comme référence (ex: 'FR' pour '+33')
    }));

    // Mettre à jour countryName quand countryCode change
    this.codeForm.get('countryCode')?.valueChanges.subscribe(code => {
      const country = this.europeanCountries.find(c => c.code === code);
      if (country) {
        this.codeForm.patchValue({ countryName: country.name });
      }
    });
  }

  ngOnInit() {
    this.loadGeneratedCodes();
  }

  ngOnDestroy() {
    this.adminSub.unsubscribe();
  }

  // Ajout de la fonction de suppression
  deleteCode(codeToDelete: any) {
    // ✅ Utiliser une confirmation native. Idéalement, la remplacer par un service de modale.
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le code admin pour ${codeToDelete.userEmail} ?`)) {
      return;
    }

    this.isLoading = true;
    this.adminSub.add(this.adminService.deleteAdminCode(codeToDelete.code).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccess(response.message || `🗑️ Code pour ${codeToDelete.userEmail} supprimé !`);
          // Recharger la liste pour refléter la suppression
          this.loadGeneratedCodes();
        } else {
          this.showError(response.error || '❌ Échec de la suppression du code.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.showError(err.error?.error || '❌ Erreur serveur lors de la suppression.');
      },
      complete: () => {
        this.isLoading = false;
      }
    }));
  }

  generateCode() {
    if (this.codeForm.valid) {
    this.isLoading = true;
    this.generatedCode = '';
    this.showCode = false;

    const formValue = this.codeForm.value;

    // Récupérer les permissions
    const selectedLevel = this.permissionLevels.find(level => level.value === formValue.permissionLevel);
    const permissions = selectedLevel?.permissions || ['post_national'];

    // ✅ APPEL À L'API VIA LE SERVICE
    this.adminSub = this.adminService.generateAdminCode(
      formValue.countryName,
      formValue.nationality,
      formValue.userEmail,
      permissions,
      formValue.expiresIn
    ).subscribe({
        next: (result) => {
          if (result.success && result.code) {
            this.generatedCode = result.code;
            this.showCode = true;
            this.loadGeneratedCodes(); // Recharger la liste (devra aussi venir de l'API)
            this.showSuccess(result.message || '✅ Code admin généré avec succès !');
          } else {
            this.showError('❌ Erreur: ' + (result.error || 'Échec de la génération du code.'));
          }
        },
        error: (err) => this.showError('❌ Erreur: ' + (err.message || 'Échec de la génération')),
        complete: () => this.isLoading = false
      }
    );
    }
  }

getPermissionLabel(): string {
  const level = this.codeForm.get('permissionLevel')?.value as 'national' | 'international' | 'both' | string;
  
  const permissionMap = {
    'national': 'National uniquement',
    'international': 'International uniquement', 
    'both': 'National + International'
  };
  
  return permissionMap[level as keyof typeof permissionMap] || 'Inconnu';
}
  copyToClipboard() {
    // Remplacer par une méthode plus robuste pour la compatibilité iFrame
    const tempInput = document.createElement('textarea');
    tempInput.value = this.generatedCode;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    this.showSuccess('📋 Code copié dans le presse-papier !');
  }

  sendByEmail() {
    this.showSuccess('📧 Code déjà envoyé à ' + this.codeForm.get('userEmail')?.value);
  }

  // Calculer la communauté prévisualisée
  getPreviewCommunity(): string {
    const country = this.codeForm.get('countryName')?.value;
    const nationality = this.codeForm.get('nationality')?.value;
    
    if (country && nationality) {
      const cleanNationality = nationality.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
      const cleanCountry = country.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
      return `${cleanNationality}En${cleanCountry}`;
    }
    
    return '...';
  }

  private loadGeneratedCodes() {
    // ✅ Cette méthode devrait maintenant s'abonner à un Observable
    this.adminSub = this.adminService.getGeneratedCodes().subscribe(codes => {
      this.generatedCodes = codes;
    });
  }

  getExpiryDate(hours: number): string {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry.toLocaleString('fr-FR');
  }

  private showSuccess(message: string) {
    // Remplacer par un toast plus tard
    console.log('✅ ' + message);
    // REMPLACER alert() par une modale ou un toast custom
    // alert(message); 
  }

  private showError(message: string) {
    console.error('❌ ' + message);
    // REMPLACER alert() par une modale ou un toast custom
    // alert(message); 
  }
}
