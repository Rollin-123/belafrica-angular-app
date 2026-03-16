/* 
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { UserService, User } from './user.service';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';

interface AuthResponse {
  success: boolean;
  user?: User;
  token: string;
  error?: string;
}
interface GenericResponse {
  success: boolean;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private storageService: StorageService
  ) {}

  requestOtp(phoneNumber: string, countryCode: string): Observable<any> {
    return this.http.post<GenericResponse & { code?: string }>(`${this.apiUrl}/request-otp`, {
      phoneNumber, countryCode
    }).pipe(
      tap(() => console.log('✅ OTP demandé')),
      catchError(error => { console.error('❌ Erreur OTP:', error); throw error; })
    );
  }

  verifyOtp(phoneNumber: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { phoneNumber, code }).pipe(
      // @ts-ignore
      tap((response: { success: boolean, tempToken?: string, user?: User, token?: string }) => {
        if (response.success && response.tempToken) {
          localStorage.setItem('belafrica_temp_token', response.tempToken);
        } else if (response.success && response.user && response.token) {
          this.storageService.setItem('belafrica_token', response.token);
        }
      }),
      catchError(error => { console.error('❌ Erreur vérification:', error); throw error; })
    );
  }

  completeProfile(profileData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/complete-profile`, profileData).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.userService.setCurrentUser(response.user);
          this.storageService.setItem('belafrica_token', response.token);
          localStorage.removeItem('belafrica_temp_token');
        }
      }),
      catchError(error => { throw error; })
    );
  }

  updateProfile(data: { pseudo?: string; bio?: string; gender?: string; profession?: string; interests?: string[] }): Observable<{ success: boolean; user: User }> {
    return this.http.put<{ success: boolean; user: User }>(`${this.apiUrl}/profile`, data).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.userService.setCurrentUser(response.user);
        }
      })
    );
  }

  isAuthenticated(): boolean {
    return !!this.userService.getCurrentUser();
  }

  /**
   * Déconnexion simple : efface le JWT et les données de session.
   * L'utilisateur peut se reconnecter avec le MÊME numéro de téléphone.
   */
  logout(): void {
    this.clearSessionData();
    this.userService.setCurrentUser(null);
    console.log('👋 Déconnexion simple.');
  }

  /**
   * Changer de numéro EN GARDANT la communauté.
   * Utile quand on perd son numéro mais veut rester dans la même communauté.
   * On conserve uniquement: community, nationality info.
   */
  logoutChangeNumber(): void {
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      // Sauvegarder la communauté pour pré-remplir lors de la réinscription
      localStorage.setItem('belafrica_saved_community', JSON.stringify({
        community: currentUser.community,
        nationality: currentUser.nationality,
        nationality_name: currentUser.nationalityName || currentUser.nationality,
        country_code: currentUser.country_code,
        country_name: currentUser.country_name
      }));
    }
    this.clearSessionData();
    this.userService.setCurrentUser(null);
    console.log('🔄 Déconnexion pour changement de numéro (communauté conservée).');
  }

  /**
   * Réinitialisation complète : supprime TOUT.
   * L'utilisateur repart de zéro (nouveau numéro + nouvelle communauté).
   */
  logoutFull(): void {
    this.clearSessionData();
    localStorage.removeItem('belafrica_saved_community');
    this.userService.setCurrentUser(null);
    console.log('🗑️ Réinitialisation complète.');
  }

  /**
   * Récupérer la communauté sauvegardée (après changement de numéro)
   */
  getSavedCommunity(): { community: string; nationality: string; nationality_name: string; country_code: string; country_name: string } | null {
    const saved = localStorage.getItem('belafrica_saved_community');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  }

  clearSavedCommunity(): void {
    localStorage.removeItem('belafrica_saved_community');
  }

  private clearSessionData(): void {
    const keys = [
      'belafrica_user',
      'temp_phone',
      'verified_phone',
      'userRegistrationData',
      'belafrica_temp_token',
      'belafrica_token',
      'belafrica_temp_phone',
      'telegram_otp_response',
      'geo_validation'
    ];
    keys.forEach(key => localStorage.removeItem(key));
  }
}
