import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-code-generator',
  standalone: false,
  templateUrl: './admin-code-generator.component.html',
  styleUrls: ['./admin-code-generator.component.scss']
})
export class AdminCodeGeneratorComponent implements OnInit {
  codeForm: FormGroup;
  isLoading = false;
  generatedCode: string = '';
  generatedCodes: any[] = [];
  showCode = false;

  // Liste des pays européens
  europeanCountries = [
    { name: 'France', code: 'FR' },
    { name: 'Belgique', code: 'BE' },
    { name: 'Allemagne', code: 'DE' },
    { name: 'Italie', code: 'IT' },
    { name: 'Espagne', code: 'ES' },
    { name: 'Suisse', code: 'CH' },
    { name: 'Royaume-Uni', code: 'UK' },
    { name: 'Canada', code: 'CA' },
    { name: 'Russie', code: 'RU' },
    { name: 'Biélorussie', code: 'BY' }
  ];

  // Liste des nationalités africaines
  africanNationalities = [
    'Algérie', 'Angola', 'Bénin', 'Botswana', 'Burkina Faso', 'Burundi',
    'Cameroun', 'Cap-Vert', 'République centrafricaine', 'Tchad', 'Comores',
    'Congo', 'Côte d\'Ivoire', 'Djibouti', 'Égypte', 'Guinée équatoriale',
    'Érythrée', 'Eswatini', 'Éthiopie', 'Gabon', 'Gambie', 'Ghana',
    'Guinée', 'Guinée-Bissau', 'Kenya', 'Lesotho', 'Libéria', 'Libye',
    'Madagascar', 'Malawi', 'Mali', 'Mauritanie', 'Maurice', 'Maroc',
    'Mozambique', 'Namibie', 'Niger', 'Nigéria', 'Rwanda', 'Sao Tomé-et-Principe',
    'Sénégal', 'Seychelles', 'Sierra Leone', 'Somalie', 'Afrique du Sud',
    'Soudan du Sud', 'Soudan', 'Tanzanie', 'Togo', 'Tunisie', 'Ouganda',
    'Zambie', 'Zimbabwe'
  ];

  // Niveaux de permissions COMPLETS
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
    private adminService: AdminService // Assurez-vous que ce service contient la logique de persistance (Firestore/LocalStorage)
  ) {
    this.codeForm = this.fb.group({
      countryCode: ['', Validators.required],
      countryName: ['', Validators.required],
      nationality: ['', Validators.required],
      userEmail: ['', [Validators.required, Validators.email]],
      permissionLevel: ['national', Validators.required],
      expiresIn: [24, Validators.required]
    });

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

  // Ajout de la fonction de suppression
  async deleteCode(codeToDelete: any) {
    // ⚠️ IMPORTANT: Utiliser une modale custom au lieu de 'alert' ou 'confirm'
    // Pour l'instant, utilisons la fonction simulée, mais cela DEVRAIT être remplacé par une modale.
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le code admin pour ${codeToDelete.userEmail} ?`)) {
      return;
    }

    try {
      this.isLoading = true;
      // ⚠️ Simulation d'un appel à un service pour supprimer le code
      // Vous devez implémenter cette méthode dans votre AdminService.
      // await this.adminService.deleteAdminCode(codeToDelete.code); 
      
      // Mise à jour de la liste locale après la suppression (ou simulation de suppression)
      this.generatedCodes = this.generatedCodes.filter(c => c.code !== codeToDelete.code);
      this.showSuccess(`🗑️ Code pour ${codeToDelete.userEmail} supprimé !`);

    } catch (error) {
      console.error('Erreur lors de la suppression du code:', error);
      this.showError('❌ Échec de la suppression du code.');
    } finally {
      this.isLoading = false;
    }
  }

async generateCode() {
  if (this.codeForm.valid) {
    this.isLoading = true;
    this.generatedCode = '';
    this.showCode = false;

    const formValue = this.codeForm.value;
    
    try {
      // Récupérer les permissions
      const selectedLevel = this.permissionLevels.find(level => level.value === formValue.permissionLevel);
      const permissions = selectedLevel?.permissions || ['post_national'];

      // ✅ CORRECTION : Récupérer le résultat complet
      const result = await this.adminService.generateAdminCode(
        formValue.countryCode,
        formValue.countryName, 
        formValue.nationality,
        formValue.userEmail,
        permissions,
        formValue.expiresIn
      );

      // ✅ CORRECTION : Extraire le code du résultat
      if (result.success && result.code) {
        this.generatedCode = result.code;
        this.showCode = true;
        
        // Recharger la liste des codes
        this.loadGeneratedCodes();
        
        this.showSuccess('✅ Code admin généré et envoyé par email !');
      } else {
        this.showError('❌ Erreur: ' + (result.error || 'Échec de la génération'));
      }
      
    } catch (error: any) {
      console.error('Erreur génération code:', error);
      this.showError('❌ Erreur: ' + (error.message || 'Échec de la génération'));
    } finally {
      this.isLoading = false;
    }
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
    // Assurez-vous que getGeneratedCodes() existe dans votre service et renvoie un tableau d'objets { code: string, userEmail: string, ... }
    this.generatedCodes = this.adminService.getGeneratedCodes();
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
