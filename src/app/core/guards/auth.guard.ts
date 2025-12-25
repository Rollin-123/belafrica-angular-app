import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log('🔐 AuthGuard vérification...');
    
    // Vérification SYNCHRONE simple
    const isAuthenticated = this.authService.isAuthenticated();
    const user = this.authService.getCurrentUser();
    
    console.log('✅ AuthGuard statut:', {
      isAuthenticated,
      user: user?.pseudo,
      community: user?.community
    });

    if (isAuthenticated && user?.community) {
      console.log('✅ AuthGuard: Accès autorisé pour', user.pseudo);
      return true;
    }

    console.log('❌ AuthGuard: Redirection vers /auth');
    return this.router.parseUrl('/auth');
  }
}