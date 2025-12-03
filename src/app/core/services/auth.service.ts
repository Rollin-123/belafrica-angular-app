import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private api: ApiService) {}

  // ✅ Demander OTP
  requestOTP(phoneNumber: string, countryCode: string): Observable<any> {
    return this.api.post('auth/request-otp', {
      phoneNumber,
      countryCode
    });
  }

  // ✅ Vérifier OTP
  verifyOTP(phoneNumber: string, code: string): Observable<any> {
    return this.api.post('auth/verify-otp', {
      phoneNumber,
      code
    });
  }

  // ✅ Compléter le profil
  completeProfile(profileData: any): Observable<any> {
    return this.api.post('auth/complete-profile', profileData);
  }

  // ✅ Sauvegarder le token
  saveToken(token: string): void {
    localStorage.setItem('belafrica_token', token);
  }

  // ✅ Récupérer le token
  getToken(): string | null {
    return localStorage.getItem('belafrica_token');
  }

  // ✅ Vérifier si connecté
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // ✅ Déconnexion
  logout(): void {
    localStorage.removeItem('belafrica_token');
    localStorage.removeItem('belafrica_user_profile');
  }
}