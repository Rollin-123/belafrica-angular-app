import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
    this.timeout = environment.requestTimeout;
  }

  // ✅ EN-TÊTES PAR DÉFAUT
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('belafrica_token');
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-App-Version': '1.0.0',
      'X-App-Platform': 'web'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // ✅ GET
  get<T>(endpoint: string, params?: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const options = {
      headers: this.getHeaders(),
      params: this.createParams(params)
    };

    return this.http.get<T>(url, options)
      .pipe(
        timeout(this.timeout),
        catchError(this.handleError)
      );
  }

  // ✅ POST
  post<T>(endpoint: string, body: any, params?: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const options = {
      headers: this.getHeaders(),
      params: this.createParams(params)
    };

    return this.http.post<T>(url, body, options)
      .pipe(
        timeout(this.timeout),
        catchError(this.handleError)
      );
  }

  // ✅ PUT
  put<T>(endpoint: string, body: any, params?: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const options = {
      headers: this.getHeaders(),
      params: this.createParams(params)
    };

    return this.http.put<T>(url, body, options)
      .pipe(
        timeout(this.timeout),
        catchError(this.handleError)
      );
  }

  // ✅ DELETE
  delete<T>(endpoint: string, params?: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const options = {
      headers: this.getHeaders(),
      params: this.createParams(params)
    };

    return this.http.delete<T>(url, options)
      .pipe(
        timeout(this.timeout),
        catchError(this.handleError)
      );
  }

  // ✅ UPLOAD DE FICHIER
  uploadFile(endpoint: string, file: File, fieldName: string = 'file'): Observable<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    const formData = new FormData();
    formData.append(fieldName, file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('belafrica_token')}`
    });

    return this.http.post(url, formData, { headers })
      .pipe(
        timeout(this.timeout),
        catchError(this.handleError)
      );
  }

  // ✅ HELPER: Créer les params
  private createParams(params: any): HttpParams {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return httpParams;
  }

  // ✅ GESTION D'ERREURS
  private handleError(error: any) {
    console.error('API Error:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else if (error.status === 0) {
      // Pas de connexion
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    } else if (error.status === 401) {
      // Non autorisé
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      localStorage.removeItem('belafrica_token');
      window.location.reload();
    } else if (error.status === 403) {
      // Accès refusé
      errorMessage = 'Accès refusé. Permissions insuffisantes.';
    } else if (error.status === 404) {
      // Non trouvé
      errorMessage = 'Ressource non trouvée.';
    } else if (error.status === 500) {
      // Erreur serveur
      errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    } else if (error.error?.error) {
      // Erreur du backend
      errorMessage = error.error.error;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}