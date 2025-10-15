import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';

export interface User {
  userId: string;
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  nationality: string;
  nationalityName: string;
  pseudo: string;
  email?: string;
  avatar?: string;
  community: string; 
  createdAt: string;
  
  // Champs optionnels pour les nouvelles fonctionnalités
  bio?: string;
  gender?: string;
  profession?: string;
  interests?: string[];
}

// Interface pour la mise à jour (seulement les champs modifiables)
export interface UserUpdateData {
  pseudo?: string;
  avatar?: string;
  bio?: string;
  gender?: string;
  profession?: string;
  interests?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  updateStats() {
    throw new Error('Method not implemented.');
  }
  private currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUser.asObservable();

  constructor(private storageService: StorageService) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const userData = this.storageService.getItem('belafrica_user_profile');
    if (userData) {
      const community = `${userData.nationalityName}En${userData.countryName.replace(/\s/g, '')}`;
      const userWithCommunity = {
        ...userData,
        community
      };
      this.currentUser.next(userWithCommunity);
    }
  }

  // ✅ MÉTHODES EXISTANTES (conserver)
  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  getUserCommunity(): string {
    const user = this.currentUser.value;
    return user?.community || '';
  }

  logout(): void {
    this.storageService.removeItem('belafrica_user_profile');
    this.storageService.removeItem('tempPhone');
    this.storageService.removeItem('userRegistrationData');
    this.currentUser.next(null);
  }

  // ✅ NOUVELLES MÉTHODES POUR LE PROFIL
  updateProfile(updateData: UserUpdateData): Promise<User> {
    return new Promise((resolve, reject) => {
      try {
        const currentUser = this.currentUser.value;
        if (!currentUser) {
          reject(new Error('Aucun utilisateur connecté'));
          return;
        }

        const updatedUser: User = {
          ...currentUser,
          ...updateData
        };

        // Sauvegarder dans le storage
        this.storageService.setItem('belafrica_user_profile', updatedUser);
        this.currentUser.next(updatedUser);

        console.log('✅ Profil mis à jour:', updatedUser.pseudo);
        resolve(updatedUser);
      } catch (error) {
        console.error('❌ Erreur mise à jour profil:', error);
        reject(error);
      }
    });
  }

  // ✅ UPLOAD D'AVATAR (simulé)
  async uploadAvatar(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('Aucun fichier sélectionné'));
        return;
      }

      if (!file.type.startsWith('image/')) {
        reject(new Error('Veuillez sélectionner une image'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('L\'image ne doit pas dépasser 5MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageUrl = e.target.result;
        
        this.updateProfile({ avatar: imageUrl })
          .then(() => resolve(imageUrl))
          .catch(reject);
      };
      
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsDataURL(file);
    });
  }

  // ✅ GÉNÉRER UN AVATAR PAR DÉFAUT
  generateDefaultAvatar(pseudo: string): string {
    return `data:image/jpeg;base64,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`;
  }
}