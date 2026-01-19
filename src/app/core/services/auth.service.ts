/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { UserService, User } from './user.service';
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {
  }

  requestOtp(phoneNumber: string, countryCode: string): Observable<any> {
    return this.http.post<GenericResponse & { code?: string }>(`${this.apiUrl}/request-otp`, {
      phoneNumber,
      countryCode
    }).pipe(
      tap((response: any) => {
        console.log('✅ OTP demandé');
      }),
      catchError(error => {
        console.error('❌ Erreur OTP:', error);
        throw error;
      })
    );
  }

  verifyOtp(phoneNumber: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, {
      phoneNumber,
      code
    }).pipe( // @ts-ignore
      tap((response: { success: boolean, tempToken?: string }) => {
        console.log('✅ OTP vérifié');
        if (response.success && response.tempToken) {
          localStorage.setItem('belafrica_temp_token', response.tempToken);
        }
      }),
      catchError(error => {
        console.error('❌ Erreur vérification:', error);
        throw error;
      })
    );
  }

  completeProfile(profileData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/complete-profile`, profileData).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.userService.setCurrentUser(response.user);
          localStorage.removeItem('belafrica_temp_token');
          console.log('✅ Profil finalisé et utilisateur mis à jour:', response.user.pseudo);
        }
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la finalisation du profil:', error);
        throw error;
      })
    );
  }

  getToken(): string | null {
    // We can no longer read the cookie's value, but we can check for its presence.
    return document.cookie.includes('access_token=') ? 'cookie_present' : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    this.clearStorage();
    this.userService.setCurrentUser(null);  
    console.log('👋 Déconnexion et nettoyage du stockage.');
  }

  private clearStorage(): void {
    const keys = [
      'belafrica_user',  
      'temp_phone',
      'verified_phone',
      'userRegistrationData',
      'belafrica_temp_token'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
  }
}