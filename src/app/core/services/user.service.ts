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
  isPendingAdmin: boolean;
  
  // Champs admin
  isAdmin?: boolean;
  adminPermissions?: string[];
  adminLevel?: 'national' | 'international' | 'super';
  adminSince?: string;
  adminCode?: string;
  
  // Profil optionnel
  bio?: string;
  gender?: string;
  profession?: string;
  interests?: string[];
}

export interface UserUpdateData {
  pseudo?: string;
  email?: string;
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
  private currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUser.asObservable();

  constructor(private storageService: StorageService) {
    this.loadUserFromStorage();
  }

  // ✅ CORRIGÉ : Chargement SYNCHRONE et réactif
  private loadUserFromStorage(): void {
    const userData = this.storageService.getItem('belafrica_user_profile');
    
    if (userData) {
      console.log('📥 Utilisateur chargé:', userData.pseudo);
      
      // Calculer la communauté si manquante
      let community = userData.community;
      if (!community && userData.nationalityName && userData.countryName) {
        community = `${userData.nationalityName}En${userData.countryName.replace(/\s/g, '')}`;
      }
      
      const userWithCommunity = {
        ...userData,
        community: community || 'CommunautéInconnue'
      };
      
      this.currentUser.next(userWithCommunity);
    }
  }

  // ✅ NOUVEAU : Mise à jour IMMÉDIATE et réactive
  updateUser(userData: User): void {
    this.storageService.setItem('belafrica_user_profile', userData);
    this.currentUser.next(userData);
    console.log('🔄 Utilisateur mis à jour:', userData.pseudo);
  }

  // ✅ CORRIGÉ : Promotion admin avec notification
  promoteToAdmin(permissions: string[] = ['post_national']): void {
    const currentUser = this.currentUser.value;
    if (!currentUser) return;

    const updatedUser: User = {
      ...currentUser,
      isAdmin: true,
      adminPermissions: permissions,
      adminLevel: permissions.includes('post_international') ? 'international' : 'national',
      adminSince: new Date().toISOString()
    };

    this.updateUser(updatedUser);
    console.log('✅ Utilisateur promu admin:', {
      pseudo: currentUser.pseudo,
      permissions: permissions,
      level: updatedUser.adminLevel
    });
  }

  // ✅ CORRIGÉ : Vérifications en temps réel
  canUserPost(): boolean {
    const user = this.currentUser.value;
    return user?.isAdmin || false;
  }

  isUserAdmin(): boolean {
    return this.currentUser.value?.isAdmin || false;
  }

  getAdminLevel(): string {
    return this.currentUser.value?.adminLevel || 'user';
  }

  // ✅ MÉTHODES EXISTANTES AMÉLIORÉES
  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  getUserCommunity(): string {
    return this.currentUser.value?.community || '';
  }

  logout(): void {
    this.storageService.removeItem('belafrica_user_profile');
    this.storageService.removeItem('tempPhone');
    this.storageService.removeItem('userRegistrationData');
    this.currentUser.next(null);
    console.log('🚪 Utilisateur déconnecté');
  }

  generateDefaultAvatar(pseudo: string): string {
    const emojis = ['👤', '😊', '😎', '🤠', '🧑', '👨', '👩', '🧔', '👱', '👴'];
    const emojiIndex = pseudo.charCodeAt(0) % emojis.length;
    return emojis[emojiIndex];
  }

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

        this.updateUser(updatedUser);
        resolve(updatedUser);
      } catch (error) {
        reject(error);
      }
    });
  }

  async uploadAvatar(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file?.type.startsWith('image/')) {
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
      reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      reader.readAsDataURL(file);
    });
  }

  // ✅ NOUVEAU : Vérification des permissions spécifiques
  canPostNational(): boolean {
    const user = this.currentUser.value;
    return user?.isAdmin && user?.adminPermissions?.includes('post_national') || false;
  }

  canPostInternational(): boolean {
    const user = this.currentUser.value;
    return user?.isAdmin && user?.adminPermissions?.includes('post_international') || false;
  }

  // ✅ NOUVEAU : Réinitialisation pour les tests
  resetAdminStatus(): void {
    const currentUser = this.currentUser.value;
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        isAdmin: false,
        adminPermissions: undefined,
        adminLevel: undefined,
        adminSince: undefined
      };
      this.updateUser(updatedUser);
      console.log('🔄 Statut admin réinitialisé');
    }
  }
}