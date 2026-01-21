/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { Observable, of, throwError } from 'rxjs'; 
import { catchError, map, tap } from 'rxjs/operators'; 
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { AdminCode } from '../models/admin.model';
import { environment } from '../../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})

export class AdminService {
  hasPendingRequest(): boolean {
    throw new Error('Method not implemented.');
  }
  private apiUrl = `${environment.apiUrl}/admin`; 

  constructor(
    private http: HttpClient, 
    private storageService: StorageService,
    private userService: UserService,
  ) {}

  submitAdminRequest(identityImageUrl: string, motivation: string): Observable<{ success: boolean; message?: string; error?: string; }> {
    const body = {
      identityImageUrl,
      motivation
    };
    
    return this.http.post<{ success: boolean; message?: string; error?: string }>(`${this.apiUrl}/request-promotion`, body).pipe(
      catchError(err => {
        console.error('❌ Erreur API submitAdminRequest:', err);
        return throwError(() => new Error(err.error?.error || 'Erreur serveur lors de la soumission'));
      })
    );
  }

  private formatCommunityName(nationality: string, countryName: string): string {
    const cleanNationality = nationality
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '');
    
    const cleanCountry = countryName
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '');
    
    return `${cleanNationality}En${cleanCountry}`;
  }

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
    return this.http.post<{ success: boolean; code?: string; message?: string; error?: string }>(`${this.apiUrl}/generate-code`, body).pipe(
      catchError(err => {
        console.error('❌ Erreur API generateAdminCode:', err);
        return throwError(() => new Error(err.error?.error || 'Erreur serveur'));
      })
    );
  }

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
        return throwError(() => new Error(err.error?.error || 'Code invalide ou expiré'));
      })
    );
  }

  getGeneratedCodes(): Observable<AdminCode[]> {
    return this.http.get<{ success: boolean, codes: AdminCode[] }>(`${this.apiUrl}/codes`).pipe(
      map((response: { codes: any; }) => response.codes || []),
      catchError(err => {
        console.error('❌ Erreur API getGeneratedCodes:', err); // Ne pas throw ici pour ne pas bloquer l'affichage
        return of([]); 
      })
    );
  }

  deleteAdminCode(code: string): Observable<{ success: boolean; message?: string; error?: string }> {
    return this.http.delete<{ success: boolean; message?: string; error?: string }>(`${this.apiUrl}/codes/${code}`);
  }
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