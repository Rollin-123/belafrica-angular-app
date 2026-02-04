/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService, User, UserUpdateData } from '../../../../../core/services/user.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: false
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  isEditing = false;
  isLoading = false;
    editData: UserUpdateData = {
    pseudo: '',
    bio: '',
    gender: '',
    profession: '',
    interests: []
  };

  genders = [
    { value: 'male', label: 'Homme' },
    { value: 'female', label: 'Femme' },
    { value: 'other', label: 'Autre' },
    { value: 'prefer_not_to_say', label: 'Je préfère ne pas dire' }
  ];

  constructor(
    public userService: UserService, 
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.user = this.userService.getCurrentUser();
  }

  goBackToSettings(): void {
    this.router.navigate(['/app/settings']);
  }

  startEditing(): void {
    this.isEditing = true;    
    this.editData = {
      pseudo: this.user?.pseudo || '',
      bio: this.user?.bio || '',
      gender: this.user?.gender || '',
      profession: this.user?.profession || '',
      interests: this.user?.interests ? [...this.user.interests] : []
    };
    
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.editData = {
      pseudo: '',
      bio: '',
      gender: '',
      profession: '',
      interests: []
    };
  }

  async saveProfile(): Promise<void> {
    if (!this.user) {
      return;
    }

    this.isLoading = true;
    try {
      await this.userService.updateProfile(this.editData);
      // Recharger les données
      this.loadUserProfile();
      this.isEditing = false;
      
      // Réinitialiser les données d'édition
      this.editData = {
        pseudo: '',
        bio: '',
        gender: '',
        profession: '',
        interests: []
      };
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde profil:', error);
      alert('Erreur lors de la sauvegarde du profil');
    } finally {
      this.isLoading = false;
    }
  }

  async onAvatarSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;
    
    try {
      await this.userService.uploadAvatar(file);
      this.loadUserProfile();
    } catch (error: any) {
      console.error('❌ Erreur upload avatar:', error);
      alert(error.message || 'Erreur lors de l\'upload de l\'avatar');
    this.cd.detectChanges();
    } finally {
      this.isLoading = false;
      event.target.value = '';
    }
  }

  addInterest(event: any): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    
    if (value && event.key === 'Enter') {
      
      // CORRECTION : Initialisation garantie du tableau
      if (!this.editData.interests) {
        this.editData.interests = [];
      }
      
      if (!this.editData.interests.includes(value)) {
        this.editData.interests.push(value);
      }
      
      input.value = '';
      event.preventDefault();
    }
  }

  removeInterest(interest: string): void {
    
    if (this.editData.interests) {
      this.editData.interests = this.editData.interests.filter(i => i !== interest);
    }
  }

  getMemberSince(): string {
    if (!this.user?.created_at) return 'Récemment';
    
    const created = new Date(this.user.created_at);
    return created.toLocaleDateString('fr-FR');
  }

  getGenderLabel(genderValue: string | undefined): string {
    if (!genderValue) return 'Non spécifié';
    const gender = this.genders.find(g => g.value === genderValue);
    return gender ? gender.label : genderValue;
  }

  getUserInitials(): string {
    return this.user?.pseudo?.charAt(0).toUpperCase() || 'U';
  }
}