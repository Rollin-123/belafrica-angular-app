import { StorageService } from './../../../../core/services/storage.service';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

interface UserData {
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  nationality: string;
  nationalityName: string;
}

@Component({
  selector: 'app-profile-setup',
  standalone: false,
  templateUrl: './profile-setup.component.html',
  styleUrls: ['./profile-setup.component.scss']
})
export class ProfileSetupComponent implements OnInit {
  profileForm: FormGroup;
  isLoading: boolean = false;
  userData: UserData | null = null;
  avatarPreview: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private storageService: StorageService,
    private cd: ChangeDetectorRef,
    
  ) {
    this.profileForm = this.fb.group({
      pseudo: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_\- ]+$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  ngOnInit() {
    // ✅ UTILISER LE SERVICE SÉCURISÉ
    this.userData = this.storageService.getItem('userRegistrationData');
    
    if (this.userData) {
      console.log('📋 Données récupérées:', this.userData);
      
      // Vérifier les données
      if (!this.userData.countryName || !this.userData.nationalityName) {
        console.error('❌ Données manquantes:', {
          countryName: this.userData.countryName,
          nationalityName: this.userData.nationalityName
        });
      }
      
      // Pré-remplir le pseudo avec une suggestion
      const suggestedPseudo = this.generateSuggestedPseudo();
      this.profileForm.patchValue({
        pseudo: suggestedPseudo
      });
      
    } else {
      console.error('❌ Aucune donnée trouvée dans le stockage');
      this.router.navigate(['/auth/phone']);
    }
  }

  // NOUVELLE FONCTION : Convertit le code pays en emoji de drapeau (utilise le code de la nationalité)
  getFlagEmoji(countryCode: string | undefined): string {
    if (!countryCode) return '';
    const code = countryCode.toUpperCase();
    
    // Fonctionnalité basée sur les emojis pour un environnement sans librairie d'images/assets
    // Un code pays à deux lettres (ex: FR) est converti en deux lettres Unicode
    // Ex: F -> 🇫 (U+1F1EB), R -> 🇷 (U+1F1F7)
    return String.fromCodePoint(
      ...code.split('').map(char => 127397 + char.charCodeAt(0))
    );
  }

  // Générer un pseudo suggéré basé sur la nationalité
  private generateSuggestedPseudo(): string {
    if (!this.userData?.nationalityName) return 'utilisateur';
    
    const country = this.userData.nationalityName.toLowerCase();
    const randomNum = Math.floor(Math.random() * 1000);
    
    return `${country}${randomNum}`;
  }

  // Gestion de l'upload de photo
  onFileSelected(event: any): void {
  const file = event.target.files[0];
  
  if (file) {
    // Validation du fichier
    if (file.size > 2 * 1024 * 1024) {
      // NOTE: Remplacer alert() par une modal ou un message d'erreur dans le template
      alert('⚠️ La photo ne doit pas dépasser 2MB'); 
      return;
    }
    
    if (!file.type.match('image/(jpeg|png|jpg)')) {
      // NOTE: Remplacer alert() par une modal ou un message d'erreur dans le template
      alert('⚠️ Format non supporté. Utilisez JPG ou PNG'); 
    this.cd.detectChanges();
      return;
    }
    
    this.selectedFile = file;
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.avatarPreview = e.target.result;
      setTimeout(() => {
        this.avatarPreview = e.target.result;
      }, 0);
    };
    reader.readAsDataURL(file);
    this.cd.detectChanges();

  }
}

// ✅ CORRECTION : Redirection vers la bonne route
onSubmit(): void {
  if (this.profileForm.valid && this.userData) {
    this.isLoading = true;

    const userProfile = {
      ...this.userData,
      ...this.profileForm.value,
      avatar: this.avatarPreview,
      createdAt: new Date().toISOString(),
      userId: this.generateUserId(),
      isAdmin: false,
    };

    console.log('👤 Profil utilisateur créé:', userProfile);

    setTimeout(() => {
      this.isLoading = false;
      
      // ✅ STOCKER LE PROFIL
      this.storageService.setItem('belafrica_user_profile', userProfile);
      this.storageService.removeItem('tempPhone');
      this.storageService.removeItem('userRegistrationData');
      
      // ✅ REDIRECTION VERS LA BONNE ROUTE
      this.router.navigate(['/app']); 
      
    }, 2000);
  }
}

  // Générer un ID utilisateur unique
  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  goBack(): void {
    this.router.navigate(['/auth/nationality']);
  }
}
