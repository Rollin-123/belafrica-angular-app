import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http'; 
import { Observable, of } from 'rxjs'; 
import { catchError, map, tap } from 'rxjs/operators'; 
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { AdminCode, AdminVerificationRequest } from '../models/admin.model';
import { environment } from '../../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  validateAdminCodeWithRedirect(code: string, router: Router) {
    throw new Error('Method not implemented.');
  }
  submitAdminRequest(imageUrl: string, additionalInfo: any) {
    throw new Error('Method not implemented.');
  }
  hasPendingRequest(): boolean {
    throw new Error('Method not implemented.');
  }
  private apiUrl = `${environment.apiUrl}/admin`; 

  constructor(
    private http: HttpClient, 
    private storageService: StorageService,
    private userService: UserService,
  ) {}

  // ✅ FORMATER LE NOM DE LA COMMUNAUTÉ
  private formatCommunityName(nationality: string, countryName: string): string {
    const cleanNationality = nationality
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '');
    
    const cleanCountry = countryName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '');
    
    return `${cleanNationality}En${cleanCountry}`;
  }

  // ✅ NOUVEAU : Génération de code via l'API Backend
  generateAdminCode(
    countryName: string,  
    nationality: string,  
    userEmail: string,
    permissions: string[] = ['post_national'],
    expiresInHours: number = 72
  ): Observable<{ success: boolean; code?: string; message?: string; error?: string; }> {
    const community = this.formatCommunityName(nationality, countryName);
    const body = {
      community,
      userEmail,
      permissions,
      expiresInHours
    };
    // Le backend gère maintenant la génération, le stockage et l'envoi d'email.
    return this.http.post<{ success: boolean; code?: string; message?: string; error?: string }>(`${this.apiUrl}/generate-code`, body).pipe(
      catchError(err => {
        console.error('❌ Erreur API generateAdminCode:', err);
        return of({ success: false, error: err.error?.error || 'Erreur serveur' });
      })
    );
  }

  // ✅ NOUVEAU : Validation de code via l'API Backend
  validateAdminCode(code: string): Observable<{ success: boolean; message?: string; permissions?: string[]; error?: string }> {
    console.log('🔑 Validation du code avec redirection:', code);

    return this.http.post<{ success: boolean; message?: string; permissions?: string[]; error?: string }>(`${this.apiUrl}/validate-code`, { code }).pipe(
      tap(response => {
        if (response.success && response.permissions) {
          this.userService.promoteToAdmin(response.permissions);
          console.log('✅ Utilisateur promu admin avec les permissions:', response.permissions);
        }
      }),
      catchError(err => {
        console.error('❌ Erreur API validateAdminCode:', err);
        return of({ success: false, error: err.error?.error || 'Code invalide ou expiré' });
      })
    );
  }

  // ✅ NOUVEAU : Récupérer les codes actifs depuis le backend
  getGeneratedCodes(): Observable<AdminCode[]> {
    return this.http.get<{ success: boolean, codes: AdminCode[] }>(`${this.apiUrl}/codes`).pipe(
      map((response: { codes: any; }) => response.codes || []),
      catchError(err => {
        console.error('❌ Erreur API getGeneratedCodes:', err);
        return of([]); 
      })
    );
  }

  // ✅ NOUVEAU : Supprimer un code via l'API
  deleteAdminCode(code: string): Observable<{ success: boolean; message?: string; error?: string }> {
    return this.http.delete<{ success: boolean; message?: string; error?: string }>(`${this.apiUrl}/codes/${code}`);
  }
  // ✅ VÉRIFICATIONS DE PERMISSIONS EN TEMPS RÉEL
  canPostNational(): boolean {
    return this.userService.canPostNational();
  }

  canPostInternational(): boolean {
    return this.userService.canPostInternational();
  }

  isUserAdmin(): boolean {
    return this.userService.isUserAdmin();
  }

  resetAdminData(): void {
    this.userService.resetAdminStatus();
    console.log('🔄 Données admin réinitialisées');
  }
}