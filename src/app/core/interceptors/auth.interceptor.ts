import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { StorageService } from '../services/storage.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private storageService: StorageService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    let authToken: string | null = null;

    if (req.url.includes('/complete-profile')) {
      authToken = this.storageService.getItem('belafrica_temp_token');
    } else {
      authToken = this.storageService.getItem('belafrica_token');
    }

    if (authToken) {
      const clonedReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${authToken}`),
      });
      return next.handle(clonedReq);
    }

    // Si pas de token, on laisse passer la requête telle quelle
    return next.handle(req);
  }
}