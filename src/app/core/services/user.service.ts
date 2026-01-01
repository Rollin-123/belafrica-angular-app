import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';

// ✅ Interface alignée sur la réponse du backend (snake_case) et complète
export interface User {
  id: string;
  pseudo: string;
  email: string;
  phone_number: string;
  community: string; // ex: "CamerounEnFrance"
  country_code: string; // ✅ Ajouté
  country_name: string; // ex: "France"
  nationality: string; // ✅ Ajouté
  nationality_name: string; // ex: "Cameroun"
  avatar_url?: string | null;
  is_admin: boolean; // Vrai si l'utilisateur a des droits admin
  admin_permissions?: string[]; // ex: ['post_national', 'post_international']
  admin_level?: 'national' | 'international' | 'super';
  created_at: string; // ✅ Renommé et type string pour ISO date
  updated_at: string; // ✅ Ajouté
  is_verified: boolean; // ✅ Ajouté
  last_login?: string | null; // ✅ Ajouté
  login_attempts: number; // ✅ Ajouté
  ip_address?: string | null; // ✅ Ajouté
  // ✅ Ajout des champs optionnels du profil
  bio?: string;
  gender?: string;
  profession?: string;
  interests?: string[];
}

// ✅ Interface pour la mise à jour du profil
export interface UserUpdateData {
  pseudo?: string;
  bio?: string;
  gender?: string;
  profession?: string;
  interests?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly storageKey = 'belafrica_user';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(private storageService: StorageService) {
    // ✅ Initialize properties here, AFTER `storageService` is available.
    this.currentUserSubject = new BehaviorSubject<User | null>(this.loadUserFromStorage());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private loadUserFromStorage(): User | null {
    const user = this.storageService.getItem(this.storageKey) as User | null;
    if (user) {
      console.log('👤 Utilisateur chargé depuis le stockage:', user.pseudo);
      return user;
    }
    return null;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    if (user) {
      this.storageService.setItem(this.storageKey, user);
      console.log('💾 Utilisateur sauvegardé:', user.pseudo);
    } else {
      this.storageService.removeItem(this.storageKey);
      console.log('🗑️ Données utilisateur supprimées du stockage.');
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  public updateUser(partialUser: Partial<User>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...partialUser };
      this.setCurrentUser(updatedUser);
      console.log('🔄 Profil utilisateur mis à jour localement.');
    }
  }

  public promoteToAdmin(permissions: string[]): void {
    const adminLevel = permissions.includes('post_international') ? 'international' : 'national';
    this.updateUser({ is_admin: true, admin_permissions: permissions, admin_level: adminLevel });
    console.log(`👑 Utilisateur promu admin avec le niveau: ${adminLevel}`);
  }

  public resetAdminStatus(): void {
    this.updateUser({ is_admin: false, admin_permissions: [], admin_level: undefined });
  }

  public canPostNational(): boolean {
    return this.getCurrentUser()?.admin_permissions?.includes('post_national') ?? false;
  }

  public canPostInternational(): boolean {
    return this.getCurrentUser()?.admin_permissions?.includes('post_international') ?? false;
  }

  public isUserAdmin(): boolean {
    return this.getCurrentUser()?.is_admin ?? false;
  }

  public getUserCommunity(): string {
    return this.getCurrentUser()?.community || '';
  }

  // ✅ NOUVEAU : Méthodes pour la gestion du profil
  public async updateProfile(updateData: UserUpdateData): Promise<User> {
    return new Promise((resolve, reject) => {
      try {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
          return reject(new Error('Aucun utilisateur connecté'));
        }

        // Ici, on devrait appeler le backend pour persister les changements.
        // Pour l'instant, on met à jour localement.
        console.log('API Call (simulé): Mettre à jour le profil avec', updateData);
        
        const updatedUser: User = { ...currentUser, ...updateData };
        this.updateUser(updatedUser);
        resolve(updatedUser);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async uploadAvatar(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file?.type.startsWith('image/')) {
        return reject(new Error('Veuillez sélectionner une image'));
      }

      if (file.size > 5 * 1024 * 1024) {
        return reject(new Error('L\'image ne doit pas dépasser 5MB'));
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageUrl = e.target.result;
        // Ici, on devrait uploader sur Cloudinary puis mettre à jour l'URL dans le profil via le backend.
        // Pour l'instant, on met à jour localement.
        this.updateUser({ avatar_url: imageUrl });
        resolve(imageUrl);
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsDataURL(file);
    });
  }

  public generateDefaultAvatar(pseudo: string): string {
    const emojis = ['👤', '😊', '😎', '🤠', '🧑', '👨', '👩', '🧔', '👱', '👴'];
    const emojiIndex = pseudo.charCodeAt(0) % emojis.length;
    return emojis[emojiIndex];
  }
}