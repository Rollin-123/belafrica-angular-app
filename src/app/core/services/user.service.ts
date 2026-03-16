/* 
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  pseudo: string;
  email: string;
  phone_number: string;
  community: string;
  country_code: string;
  country_name: string;
  nationality: string;
  nationality_name: string;
  nationalityName?: string; 
  avatar_url?: string | null;
  is_admin: boolean;
  admin_permissions?: string[];
  admin_level?: 'national' | 'international' | 'super';
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  last_login?: string | null;
  login_attempts: number;
  ip_address?: string | null;
  bio?: string;
  gender?: string;
  profession?: string;
  interests?: string[];
}

export interface UserUpdateData {
  pseudo?: string;
  bio?: string;
  gender?: string;
  profession?: string;
  interests?: string[];
  avatar_url?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly storageKey = 'belafrica_user';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private storageService: StorageService,
    private http: HttpClient
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.loadUserFromStorage());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private loadUserFromStorage(): User | null {
    const user = this.storageService.getItem(this.storageKey) as User | null;
    if (user) console.log('👤 Utilisateur chargé:', user.pseudo);
    return user || null;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    if (user) {
      this.storageService.setItem(this.storageKey, user);
    } else {
      this.storageService.removeItem(this.storageKey);
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  public updateUser(partialUser: Partial<User>): void {
    const current = this.getCurrentUser();
    if (current) {
      this.setCurrentUser({ ...current, ...partialUser });
    }
  }

  /**
   * Met à jour le profil via le backend ET localement.
   */
  public updateProfile(updateData: UserUpdateData): Observable<{ success: boolean; user: User }> {
    return this.http.put<{ success: boolean; user: User }>(`${this.apiUrl}/profile`, updateData).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.setCurrentUser(response.user);
          console.log('✅ Profil mis à jour en base:', response.user.pseudo);
        }
      })
    );
  }

  /**
   * Upload avatar vers Cloudinary puis met à jour le profil.
   */
  public async uploadAvatar(file: File): Promise<string> {
    if (!file?.type.startsWith('image/')) throw new Error('Veuillez sélectionner une image');
    if (file.size > 5 * 1024 * 1024) throw new Error('L\'image ne doit pas dépasser 5MB');

    // Upload vers Cloudinary
    const CLOUD_NAME = 'ddcda1blt';
    const UPLOAD_PRESET = 'unsigned_admin';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'avatars');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Erreur upload Cloudinary');
    const result = await response.json();
    const avatarUrl = result.secure_url;

    // Persister via le backend
    await this.updateProfile({ avatar_url: avatarUrl }).toPromise();
    return avatarUrl;
  }

  public promoteToAdmin(permissions: string[]): void {
    const adminLevel = permissions.includes('post_international') ? 'international' : 'national';
    this.updateUser({ is_admin: true, admin_permissions: permissions, admin_level: adminLevel });
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

  public generateDefaultAvatar(pseudo: string): string {
    const emojis = ['👤', '😊', '😎', '🤠', '🧑', '👨', '👩', '🧔', '👱', '👴'];
    return emojis[pseudo.charCodeAt(0) % emojis.length];
  }
}