import { Component, OnInit } from '@angular/core';
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
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      pseudo: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_-]+$/)
      ]],
      email: ['', [
        Validators.email
      ]],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

 ngOnInit() {
  // Récupérer les données utilisateur depuis le localStorage
  const userDataStr = localStorage.getItem('userRegistrationData');
  
  if (userDataStr) {
    try {
      this.userData = JSON.parse(userDataStr);
      console.log('📋 Données récupérées:', this.userData); // Debug
      
      // VÉRIFICATION : Afficher les données dans la console
      if (this.userData && (!this.userData.countryName || !this.userData.nationalityName)) {
        console.error('❌ Données manquantes:', { // Object is possibly 'null'.
          countryName: this.userData.countryName,
          nationalityName: this.userData.nationalityName
        });
      }
      
      // Pré-remplir le pseudo avec une suggestion
      const suggestedPseudo = this.generateSuggestedPseudo();
      this.profileForm.patchValue({
        pseudo: suggestedPseudo
      });
      
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
      this.router.navigate(['/auth/phone']);
    }
  } else {
    console.error('❌ Aucune donnée trouvée dans localStorage');
    this.router.navigate(['/auth/phone']);
  }
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
      if (file.size > 2 * 1024 * 1024) { // 2MB max
        alert('⚠️ La photo ne doit pas dépasser 2MB');
        return;
      }
      
      if (!file.type.match('image/(jpeg|png|jpg)')) {
        alert('⚠️ Format non supporté. Utilisez JPG ou PNG');
        return;
      }
      
      this.selectedFile = file;
      
      // Prévisualisation
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Soumission du formulaire
  onSubmit(): void {
    if (this.profileForm.valid && this.userData) {
      this.isLoading = true;

      // Préparer les données finales de l'utilisateur
      const userProfile = {
        ...this.userData,
        ...this.profileForm.value,
        avatar: this.avatarPreview,
        createdAt: new Date().toISOString(),
        userId: this.generateUserId()
      };

      console.log('👤 Profil utilisateur créé:', userProfile);

      // Simulation création de compte
      setTimeout(() => {
        this.isLoading = false;
        
        // Stocker le profil utilisateur complet
        localStorage.setItem('belafrica_user_profile', JSON.stringify(userProfile));
        localStorage.removeItem('tempPhone'); // Nettoyer les données temporaires
        localStorage.removeItem('userRegistrationData');
        
        // Redirection vers l'application principale
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