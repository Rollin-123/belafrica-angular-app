// src/app/modules/auth/pages/profile-setup.component.ts (modifications)
/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

interface UserRegistrationData {
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  nationality: string;
  nationalityName: string;
  community: string; // AJOUTEZ CE CHAMP
}

@Component({
  selector: 'app-profile-setup',
  templateUrl: './profile-setup.component.html',
  standalone: false,
  styleUrls: ['./profile-setup.component.scss']
})
export class ProfileSetupComponent implements OnInit {
  profileForm: FormGroup;
  isLoading: boolean = false;
  userData: UserRegistrationData | null = null;
  avatarPreview: string | null = null;
  selectedFile: File | null = null;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cd: ChangeDetectorRef
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
    const userDataStr = localStorage.getItem('userRegistrationData');
    if (userDataStr) {
      try {
        this.userData = JSON.parse(userDataStr);
        console.log('📋 Données récupérées:', this.userData);
        
        const suggestedPseudo = this.generateSuggestedPseudo();
        this.profileForm.patchValue({
          pseudo: suggestedPseudo
        });
        
      } catch (error) {
        console.error('❌ Erreur parsing user data:', error);
        this.router.navigate(['/auth/phone']);
      }
      
    } else {
      console.error('❌ Aucune donnée trouvée');
      this.router.navigate(['/auth/phone']);
    }
  }

  getFlagEmoji(countryCode: string | undefined): string {
    if (!countryCode) return '';
    const code = countryCode.toUpperCase();
    return String.fromCodePoint(
      ...code.split('').map(char => 127397 + char.charCodeAt(0))
    );
  }

  private generateSuggestedPseudo(): string {
    if (!this.userData?.nationalityName) return 'utilisateur';
    
    const country = this.userData.nationalityName.toLowerCase();
    const randomNum = Math.floor(Math.random() * 1000);
    
    return `${country}${randomNum}`;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.errorMessage = '⚠️ La photo ne doit pas dépasser 2MB';
        this.cd.detectChanges();
        return;
      }
      
      if (!file.type.match('image/(jpeg|png|jpg)')) {
        this.errorMessage = '⚠️ Format non supporté. Utilisez JPG ou PNG';
        this.cd.detectChanges();
        return;
      }
      
      this.selectedFile = file;
      this.errorMessage = '';
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
        this.cd.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid && this.userData) {
      this.isLoading = true;
      this.errorMessage = '';

      const completeProfileData = {
        phoneNumber: this.userData.phoneNumber,
        countryCode: this.userData.countryCode,
        countryName: this.userData.countryName,
        nationality: this.userData.nationality,
        nationalityName: this.userData.nationalityName,
        community: this.userData.community, 
        pseudo: this.profileForm.value.pseudo,
        email: this.profileForm.value.email,
        avatar: this.avatarPreview
      };

      console.log('👤 Envoi du profil complet:', completeProfileData);

      this.authService.completeProfile(completeProfileData)
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            console.log('✅ Réponse création profil:', response);
            
            if (response.success && response.user) {
              localStorage.removeItem('belafrica_temp_phone');
              localStorage.removeItem('userRegistrationData');
              localStorage.removeItem('belafrica_temp_token');
              
              alert('🎉 Compte créé avec succès ! Bienvenue sur BELAFRICA.');
              
              setTimeout(() => {
                this.router.navigate(['/app']);
              }, 1000);
            } else {
              this.errorMessage = response.error || 'Erreur lors de la création du compte';
              alert(`❌ ${this.errorMessage}`);
            }
          },
          error: (error) => {
            this.isLoading = false;
            console.error('❌ Erreur création profil:', error);
            this.errorMessage = error.message || 'Erreur de connexion au serveur';
            alert(`❌ ${this.errorMessage}`);
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/auth/nationality']);
  }
}