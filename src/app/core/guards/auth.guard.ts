// src/app/core/guards/auth.guard.ts - CORRIGÉ
import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    console.log('🔐 AuthGuard vérification...');
    
    // Vérifier si l'utilisateur est authentifié
    const isAuthenticated = this.authService.isLoggedIn();
    
    if (isAuthenticated) {
      console.log('✅ AuthGuard: Utilisateur authentifié');
      return true;
    } else {
      console.log('❌ AuthGuard: Utilisateur non authentifié, redirection vers /auth/phone');
      
      // Rediriger vers la page téléphone
      return this.router.createUrlTree(['/auth/phone'], {
        queryParams: { 
          returnUrl: state.url,
          reason: 'auth_required'
        }
      });
    }
  }
}