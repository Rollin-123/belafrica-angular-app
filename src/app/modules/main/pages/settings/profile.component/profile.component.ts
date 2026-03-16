/* 
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
 */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService, User, UserUpdateData } from '../../../../../core/services/user.service';
import { ModalService } from '../../../../../core/services/modal.service';

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
  isSavingAvatar = false;
  errorMessage = '';
  successMessage = '';

  editData: UserUpdateData = { pseudo: '', bio: '', gender: '', profession: '', interests: [] };

  genders = [
    { value: 'male', label: 'Homme' },
    { value: 'female', label: 'Femme' },
    { value: 'other', label: 'Autre' },
    { value: 'prefer_not_to_say', label: 'Préfère ne pas dire' }
  ];

  constructor(
    public userService: UserService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private modalService: ModalService
  ) {}

  ngOnInit() {
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
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.resetEditData();
  }

  async saveProfile(): Promise<void> {
    if (!this.user || !this.editData.pseudo?.trim()) {
      this.errorMessage = 'Le pseudo est requis.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';

    this.userService.updateProfile(this.editData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.user = response.user;
        this.isEditing = false;
        this.resetEditData();
        this.successMessage = 'Profil mis à jour avec succès !';
        setTimeout(() => this.successMessage = '', 3000);
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.error || 'Erreur lors de la sauvegarde.';
        this.cd.detectChanges();
      }
    });
  }

  async onAvatarSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    this.isSavingAvatar = true;
    this.errorMessage = '';
    try {
      const url = await this.userService.uploadAvatar(file);
      this.user = this.userService.getCurrentUser();
      this.successMessage = 'Photo de profil mise à jour !';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Erreur lors de l\'upload.';
    } finally {
      this.isSavingAvatar = false;
      event.target.value = '';
      this.cd.detectChanges();
    }
  }

  addInterest(event: any): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    if (value && event.key === 'Enter') {
      if (!this.editData.interests) this.editData.interests = [];
      if (!this.editData.interests.includes(value)) this.editData.interests.push(value);
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
    return new Date(this.user.created_at).toLocaleDateString('fr-FR');
  }

  getGenderLabel(genderValue: string | undefined): string {
    if (!genderValue) return 'Non spécifié';
    return this.genders.find(g => g.value === genderValue)?.label || genderValue;
  }

  getUserInitials(): string {
    return this.user?.pseudo?.charAt(0).toUpperCase() || 'U';
  }

  private resetEditData(): void {
    this.editData = { pseudo: '', bio: '', gender: '', profession: '', interests: [] };
  }
}