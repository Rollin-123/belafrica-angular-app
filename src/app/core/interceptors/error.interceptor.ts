/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Intercepteur HTTP erreur:', {
          url: req.url,
          status: error.status,
          message: error.message
        });
        if (error.status === 401 || error.status === 403) {
          console.log('🔐 Session expirée, redirection login');
          localStorage.removeItem('belafrica_token');  
          localStorage.removeItem('belafrica_temp_token');  
          this.router.navigate(['/auth']);
        }
        return throwError(() => error);
      })
    );
  }
}