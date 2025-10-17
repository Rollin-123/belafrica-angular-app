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
private userUpdate = new BehaviorSubject<User | null>(null);
public userUpdate$ = this.userUpdate.asObservable();

  constructor(private storageService: StorageService) {
    this.loadUserFromStorage();
  }

  // ✅ CORRECTION : Chargement utilisateur
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

  
  // ✅ AJOUTEZ CETTE MÉTHODE DANS UserServicegetCurrentUser
// generateDefaultAvatar(pseudo: string): string {
//   // Avatar par défaut avec les initiales sur fond coloré
//   const initials = pseudo.charAt(0).toUpperCase();
//   const colors = [
//     '#F2A900', '#008751', '#E53E3E', '#3182CE', '#38A169', 
//     '#D69E2E', '#805AD5', '#DD6B20'
//   ];
  
//   const colorIndex = pseudo.charCodeAt(0) % colors.length;
//   const backgroundColor = colors[colorIndex];
  
//   // SVG simple avec initiales
//   return `data:image/svg+xml;base64,${btoa(`
//     <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
//       <rect width="100" height="100" fill="${backgroundColor}" rx="50"/>
//       <text x="50" y="60" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="40" font-weight="bold">${initials}</text>
//     </svg>
//   `)}`;
// }

// ✅ VERSION ALTERNATIVE AVEC EMOJI
generateDefaultAvatar(pseudo: string): string {
  const emojis = ['👤', '😊', '😎', '🤠', '🧑', '👨', '👩', '🧔', '👱', '👴'];
  const emojiIndex = pseudo.charCodeAt(0) % emojis.length;
  return emojis[emojiIndex];
}

  // ✅ MÉTHODES DE BASE
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
  }

  // ✅ MÉTHODES ADMIN
  makeUserAdmin(permissions: string[] = ['post_national']): void {
    const currentUser = this.currentUser.value;
    if (!currentUser) return;

    const updatedUser: User = {
      ...currentUser,
      isAdmin: true,
      adminPermissions: permissions,
      adminLevel: permissions.includes('post_international') ? 'international' : 'national',
      adminSince: new Date().toISOString()
    };

    this.saveUser(updatedUser);
    console.log('✅ Utilisateur promu admin:', currentUser.pseudo);
  }

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

  // ✅ MÉTHODES PROFIL
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

        this.saveUser(updatedUser);
        resolve(updatedUser);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ✅ UPLOAD AVATAR
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
  notifyUserUpdate(): void {
  this.userUpdate.next(this.currentUser.value);
}

  // ✅ MÉTHODE PRIVÉE POUR SAUVEGARDE
  private saveUser(user: User): void {
    this.storageService.setItem('belafrica_user_profile', user);
    this.currentUser.next(user);
  }
}