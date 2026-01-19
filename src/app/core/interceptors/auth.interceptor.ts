/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StorageService } from '../services/storage.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private storageService: StorageService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Cet intercepteur ne gère plus que le token temporaire pour la finalisation du profil.
    // Le token de session principal est géré par un cookie HttpOnly.
    if (req.url.includes('/complete-profile')) {
      const tempToken = this.storageService.getItem('belafrica_temp_token');
      if (tempToken) {
        const clonedReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${tempToken}`),
        });
        return next.handle(clonedReq);
      }
    }

    // Si pas de token, on laisse passer la requête telle quelle
    return next.handle(req);
  }
}