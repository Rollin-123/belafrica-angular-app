import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; 
import { User } from './user.service'; 

export interface AuthUser {
  id: string;
  pseudo: string;
  phoneNumber: string;
  community: string;
  isAdmin: boolean;
  avatar?: string;
}
interface AuthResponse {
  success: boolean;
  user: User;
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
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const userData = localStorage.getItem('belafrica_user');
      const token = localStorage.getItem('belafrica_token');
      
      if (userData && token) {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        console.log('👤 Utilisateur chargé:', user.pseudo);
      }
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      this.clearStorage();
    }
  }

  requestOtp(phoneNumber: string, countryCode: string): Observable<any> {
    return this.http.post<GenericResponse & { code?: string }>(`${this.apiUrl}/request-otp`, {
      phoneNumber,
      countryCode
    }).pipe(
      tap((response: any) => {
        console.log('✅ OTP demandé');
        localStorage.setItem('temp_phone', JSON.stringify({
          phone: `${countryCode}${phoneNumber}`,
          countryCode,
          time: Date.now()
        }));
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
        if (response.success && response.user && response.token) {
          // Mettre à jour l'utilisateur et le token après la finalisation du profil
          const user = response.user as AuthUser;
          this.currentUserSubject.next(user);
          // Nettoyer les tokens temporaires et stocker les définitifs
          localStorage.removeItem('belafrica_temp_token');
          localStorage.setItem('belafrica_user', JSON.stringify(user));
          localStorage.setItem('belafrica_token', response.token);
          console.log('✅ Profil finalisé et utilisateur mis à jour:', user.pseudo);
        }
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la finalisation du profil:', error);
        throw error;
      })
    );
  }

  isAuthenticated(): boolean {
    const user = this.currentUserSubject.value;
    const token = localStorage.getItem('belafrica_token');
    return !!(user && token);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  logout(): void {
    this.clearStorage();
    this.currentUserSubject.next(null);
    console.log('👋 Déconnexion');
  }

  private clearStorage(): void {
    const keys = [
      'belafrica_user',
      'belafrica_token',
      'temp_phone',
      'verified_phone',
      'userRegistrationData',
      'belafrica_temp_token'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
  }
}